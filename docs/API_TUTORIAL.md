# [123云盘](https://www.123pan.com) 无限制分享工具（API接口文档）

## 目录
- [123云盘 无限制分享工具（API接口文档）](#123云盘-无限制分享工具api接口文档)
  - [目录](#目录)
  - [对接机器人相关](#对接机器人相关)
    - [通用说明：排队机制](#通用说明排队机制)
    - [POST /api/export (导出个人网盘文件)](#post-apiexport-导出个人网盘文件)
    - [POST /api/import (导入分享到个人网盘)](#post-apiimport-导入分享到个人网盘)
    - [POST /api/link (从分享链接导出)](#post-apilink-从分享链接导出)
  - [公共资源库相关](#公共资源库相关)
    - [POST /api/get\_content\_tree (获取分享内容目录树)](#post-apiget_content_tree-获取分享内容目录树)
    - [POST /api/get\_sharecode (通过短码获取长分享码)](#post-apiget_sharecode-通过短码获取长分享码)
    - [POST /api/search\_database (搜索公共资源)](#post-apisearch_database-搜索公共资源)
    - [POST /api/submit\_database (提交长分享码到数据库)](#post-apisubmit_database-提交长分享码到数据库)
    - [GET /api/list\_public\_shares (列出公共资源)](#get-apilist_public_shares-列出公共资源)
  - [管理后台API](#管理后台api)
    - [通用说明：管理员认证](#通用说明管理员认证)
    - [GET /api/{ADMIN\_ENTRY}/get\_shares (获取分享列表)](#get-apiadmin_entryget_shares-获取分享列表)
    - [POST /api/{ADMIN\_ENTRY}/update\_share\_status (更新分享状态)](#post-apiadmin_entryupdate_share_status-更新分享状态)
    - [POST /api/{ADMIN\_ENTRY}/update\_share\_name (更新分享名称)](#post-apiadmin_entryupdate_share_name-更新分享名称)
    - [POST /api/{ADMIN\_ENTRY}/delete\_share (删除分享)](#post-apiadmin_entrydelete_share-删除分享)
    - [POST /api/{ADMIN\_ENTRY}/update\_database (从远程更新数据库)](#post-apiadmin_entryupdate_database-从远程更新数据库)

---

## 对接机器人相关

### 通用说明：排队机制
`export`, `import`, `link` 这三个API接口在服务器端执行时，如果涉及到与123云盘官方API的交互（例如登录、列出文件、导入文件等），会将请求加入一个任务队列中排队执行。这样做是为了避免因短时间内向123云盘API发送过多请求而导致服务器IP被暂时封禁或限制。客户端会收到流式的状态更新，告知排队情况及操作进度。

---

### POST /api/export (导出个人网盘文件)
从用户123网盘账户中导出指定目录（或整个网盘）的文件结构为长分享码。可以选择性地生成短分享码并加入资源共享计划。

**请求参数 (JSON Body)**
| 参数名称                | 类型    | 是否必填 | 描述                                                                 |
|-------------------------|---------|----------|----------------------------------------------------------------------|
| `username`              | string  | 是       | 123云盘用户名/邮箱                                                        |
| `password`              | string  | 是       | 123云盘密码                                                             |
| `homeFilePath`          | string  | 否       | 要导出的文件夹ID，默认为 "0" (根目录)                                      |
| `userSpecifiedBaseName` | string  | 否       | 用户指定的分享名称，如果 `generateShortCode` 或 `shareProject` 为 `true` 时建议填写 |
| `generateShortCode`     | boolean | 否       | 是否生成短分享码 (默认为 `false`)。如果 `shareProject` 为 `true`，此项强制为 `true`。 |
| `shareProject`          | boolean | 否       | 是否加入资源共享计划 (默认为 `false`)，加入后将提交到数据库等待审核。如果为 `true`，则 `userSpecifiedBaseName` 必填。 |

**响应内容 (application/x-ndjson - 流式，每行一个JSON对象)**
每个JSON对象包含以下字段：
| 字段名     | 类型           | 描述                                                                                                                               |
|------------|----------------|------------------------------------------------------------------------------------------------------------------------------------|
| `isFinish` | boolean / None | `None`: 操作进行中； `True`: 操作成功完成； `False`: 操作失败。                                                                            |
| `message`  | string         | 操作信息或结果。如果 `isFinish` 为 `True`，`message` 将是一个JSON字符串，包含 `{"longShareCode": "...", "shortShareCode": "..."}`（如果生成了短码）。 |

**示例流式响应片段:**
```json
{"isFinish": null, "message": "正在排队中... 前面还有 1 人。"}
{"isFinish": null, "message": "恭喜义父, 轮到您嘞! 操作即将开始..."}
{"isFinish": null, "message": "准备登录..."}
{"isFinish": null, "message": "登录成功，开始导出文件列表..."}
{"isFinish": null, "message": "获取文件列表中：parentFileId: 0"}
{"isFinish": true, "message": "{\"longShareCode\":\"长分享码base64数据...\",\"shortShareCode\":\"生成的短分享码hash...\"}"}
```
**错误响应示例 (单行):**
```json
{"isFinish": false, "message": "登录失败，请检查用户名和密码。"}
```
**状态码:**
*   `200 OK`: 请求被接受并开始处理（流式响应）。
*   `400 Bad Request`: 请求参数错误。

---

### POST /api/import (导入分享到个人网盘)
将通过长分享码或短分享码表示的文件结构导入到用户指定的123网盘账户中。

**请求参数 (JSON Body)**
| 参数名称           | 类型    | 是否必填 | 描述                                                                                                     |
|--------------------|---------|----------|----------------------------------------------------------------------------------------------------------|
| `username`         | string  | 是       | 123云盘用户名/邮箱                                                                                           |
| `password`         | string  | 是       | 123云盘密码                                                                                                |
| `codeHash`         | string  | 否       | 短分享码 (64位SHA256哈希值)。如果提供此项，则忽略 `base64Data` 和 `rootFolderName`。                               |
| `base64Data`       | string  | 否       | 长分享码 (Base64编码的文件结构数据)。如果提供此项，则 `rootFolderName` 也必须提供。                                      |
| `rootFolderName`   | string  | 否       | 当使用 `base64Data` 导入时，在用户网盘根目录下创建的文件夹名称。                                                     |
| `shareProject`     | boolean | 否       | 仅当使用 `base64Data` 导入时有效 (默认为 `false`)。如果为 `true`，则此长分享码也会被提交到公共资源库 (待审核)，且 `rootFolderName` 不能为空。 |

**响应内容 (application/x-ndjson - 流式，每行一个JSON对象)**
每个JSON对象包含以下字段：
| 字段名     | 类型           | 描述                                                                     |
|------------|----------------|--------------------------------------------------------------------------|
| `isFinish` | boolean / None | `None`: 操作进行中； `True`: 操作成功完成； `False`: 操作失败。                  |
| `message`  | string         | 操作信息或结果。如果 `isFinish` 为 `True`，`message` 通常是导入成功的信息。 |

**示例流式响应片段:**
```json
{"isFinish": null, "message": "正在排队中... 前面还有 0 人。"}
{"isFinish": null, "message": "恭喜义父, 轮到您嘞! 操作即将开始..."}
{"isFinish": null, "message": "准备登录到123网盘..."}
{"isFinish": null, "message": "登录成功，准备导入数据..."}
{"isFinish": null, "message": "正在通过短分享码 a1b2c3d4... 从数据库获取数据..."}
{"isFinish": null, "message": "[1/10][速度: 0.50 个/秒][预估剩余时间: 18.00 秒] 正在创建文件夹: 示例文件夹"}
{"isFinish": true, "message": "导入完成, 保存到123网盘根目录中的: >>> 导入的分享_20230101120000_GitHub@realcwj <<< 文件夹"}
```
**错误响应示例 (单行):**
```json
{"isFinish": false, "message": "登录123网盘失败，请检查用户名和密码。"}
{"isFinish": false, "message": "短分享码无效或未在数据库中找到。"}
```
**状态码:**
*   `200 OK`: 请求被接受并开始处理（流式响应）。
*   `400 Bad Request`: 请求参数错误（例如，同时提供了 `codeHash` 和 `base64Data`，或者必要参数缺失）。

---

### POST /api/link (从分享链接导出)
从一个公开的123云盘分享链接（例如 `https://www.123pan.com/s/xxxx-yyyyy` 或 `https://www.123pan.com/s/xxxx`）中提取文件结构，并生成长分享码。可以选择性地生成短分享码并加入资源共享计划。此接口不需要用户登录123网盘。

**请求参数 (JSON Body)**
| 参数名称                | 类型    | 是否必填 | 描述                                                                                   |
|-------------------------|---------|----------|----------------------------------------------------------------------------------------|
| `shareKey`              | string  | 是       | 123云盘分享链接的Key部分 (例如 `xxxx-yyyyy` 或 `xxxx`)                                     |
| `sharePwd`              | string  | 否       | 分享链接的密码 (如果有)                                                                     |
| `parentFileId`          | string  | 否       | 从分享链接的哪个文件夹ID开始导出，默认为 "0" (分享的根目录)                                     |
| `userSpecifiedBaseName` | string  | 否       | 用户指定的分享名称，如果 `generateShortCode` 或 `shareProject` 为 `true` 时建议填写                   |
| `generateShortCode`     | boolean | 否       | 是否生成短分享码 (默认为 `false`)。如果 `shareProject` 为 `true`，此项强制为 `true`。       |
| `shareProject`          | boolean | 否       | 是否加入资源共享计划 (默认为 `false`)，加入后将提交到数据库等待审核。如果为 `true`，则 `userSpecifiedBaseName` 必填。 |

**响应内容 (application/x-ndjson - 流式，每行一个JSON对象)**
同 `/api/export` 的响应结构。
| 字段名     | 类型           | 描述                                                                                                                               |
|------------|----------------|------------------------------------------------------------------------------------------------------------------------------------|
| `isFinish` | boolean / None | `None`: 操作进行中； `True`: 操作成功完成； `False`: 操作失败。                                                                            |
| `message`  | string         | 操作信息或结果。如果 `isFinish` 为 `True`，`message` 将是一个JSON字符串，包含 `{"longShareCode": "...", "shortShareCode": "..."}`（如果生成了短码）。 |

**示例流式响应片段:**
```json
{"isFinish": null, "message": "正在排队中... 前面还有 2 人。"}
{"isFinish": null, "message": "开始从分享链接导出文件列表..."}
{"isFinish": null, "message": "获取文件列表中：parentFileId: 0"}
{"isFinish": true, "message": "{\"longShareCode\":\"长分享码base64数据...\",\"shortShareCode\":\"生成的短分享码hash...\"}"}
```
**错误响应示例 (单行):**
```json
{"isFinish": false, "message": "获取文件列表失败：{\"code\":401000,\"msg\":\"share pwd error\",\"info\":\"\",\"data\":null}"}
```
**状态码:**
*   `200 OK`: 请求被接受并开始处理（流式响应）。
*   `400 Bad Request`: 请求参数错误。

---

## 公共资源库相关

### POST /api/get_content_tree (获取分享内容目录树)
根据提供的短分享码 (`codeHash`) 或长分享码 (`shareCode`)，生成并返回该分享内容的目录树结构。

**请求参数 (JSON Body)**
| 参数名称      | 类型   | 是否必填 | 描述                                                                  |
|---------------|--------|----------|-----------------------------------------------------------------------|
| `codeHash`    | string | 否       | 短分享码 (64位SHA256哈希值)。如果提供，优先使用此项从数据库查找长分享码。 |
| `shareCode`   | string | 否       | 长分享码 (Base64编码的文件结构数据)。如果未提供 `codeHash`，则必须提供此项。 |

**响应内容 (JSON)**
| 字段名     | 类型          | 描述                                                          |
|------------|---------------|---------------------------------------------------------------|
| `isFinish` | boolean       | `True` 表示成功获取目录树；`False` 表示失败。                    |
| `message`  | string / array| 如果成功，`message` 是一个字符串数组，每行代表目录树的一行文本；如果失败，是错误信息字符串。 |

**成功响应示例:**
```json
{
    "isFinish": true,
    "message": [
        "📂 示例顶级文件夹",
        "├── 📄 文件1.txt",
        "└── 📂 子文件夹",
        "    └── 🖼️ 图片.jpg"
    ]
}
```
**失败响应示例:**
```json
{
    "isFinish": false,
    "message": "错误：未找到与提供的短分享码 a1b2c3d4... 对应的分享内容。"
}
```
**状态码:**
*   `200 OK`: 成功获取目录树。
*   `400 Bad Request`: 请求参数错误（例如，`codeHash` 和 `shareCode` 都未提供）。
*   `404 Not Found`: 根据 `codeHash` 未找到分享。
*   `500 Internal Server Error`: 服务器内部错误（例如，解析长分享码失败）。

---

### POST /api/get_sharecode (通过短码获取长分享码)
根据提供的短分享码 (`codeHash`) 从数据库中查询并返回对应的长分享码。

**请求参数 (JSON Body)**
| 参数名称   | 类型   | 是否必填 | 描述                       |
|------------|--------|----------|----------------------------|
| `codeHash` | string | 是       | 短分享码 (64位SHA256哈希值)。 |

**响应内容 (JSON)**
| 字段名     | 类型   | 描述                                      |
|------------|--------|-------------------------------------------|
| `isFinish` | boolean| `True` 表示成功获取；`False` 表示失败。       |
| `message`  | string | 如果成功，是长分享码 (Base64数据)；如果失败，是错误信息。 |

**成功响应示例:**
```json
{
    "isFinish": true,
    "message": "长分享码base64数据..."
}
```
**失败响应示例:**
```json
{
    "isFinish": false,
    "message": "未找到与提供的短分享码 a1b2c3d4... 对应的分享内容。"
}
```
**状态码:**
*   `200 OK`: 成功获取长分享码。
*   `400 Bad Request`: `codeHash` 参数无效或缺失。
*   `404 Not Found`: 未找到对应的分享。
*   `500 Internal Server Error`: 服务器内部错误。

---

### POST /api/search_database (搜索公共资源)
根据提供的关键词模糊搜索公共资源库中已审核通过的分享。

**请求参数 (JSON Body)**
| 参数名称         | 类型    | 是否必填 | 描述                               |
|------------------|---------|----------|------------------------------------|
| `rootFolderName` | string  | 是       | 搜索关键词（将对分享的根目录名进行模糊匹配） |
| `page`           | integer | 否       | 页码，默认为 1                          |

**响应内容 (JSON)**
| 字段名    | 类型           | 描述                                                                 |
|-----------|----------------|----------------------------------------------------------------------|
| `success` | boolean        | `True` 表示搜索成功（即使结果为空）；`False` 表示发生错误。                 |
| `files`   | array of objects | 搜索结果列表。每个对象包含 `name`, `codeHash`, `timestamp` 字段。   |
| `end`     | boolean        | 是否已到达最后一页。                                                    |
| `message` | string         | 如果 `success` 为 `False`，则包含错误信息；如果搜索词为空，则提示输入关键词。 |

**成功响应示例 (有结果):**
```json
{
    "success": true,
    "files": [
        {
            "name": "包含关键词的分享1",
            "codeHash": "hash1...",
            "timestamp": "YYYY-MM-DD HH:MM:SS"
        }
    ],
    "end": false
}
```
**成功响应示例 (无结果或搜索词为空):**
```json
{
    "success": true,
    "files": [],
    "end": true,
    "message": "请输入搜索关键词。" // (如果搜索词为空)
}
```
**失败响应示例:**
```json
{
    "success": false,
    "message": "搜索时发生服务器错误: ...",
    "files": [],
    "end": true
}
```
**状态码:**
*   `200 OK`: 搜索请求成功处理。
*   `400 Bad Request`: 请求参数错误。
*   `500 Internal Server Error`: 服务器内部错误。

---

### POST /api/submit_database (提交长分享码到数据库)
用户可以提交自己的长分享码和自定义的分享名称到数据库。
如果勾选了“加入资源共享计划”，则分享将进入待审核状态；否则，仅生成一个私密的短分享码。

**请求参数 (JSON Body)**
| 参数名称         | 类型    | 是否必填 | 描述                                                              |
|------------------|---------|----------|-------------------------------------------------------------------|
| `rootFolderName` | string  | 是       | 用户为此分享指定的名称。                                                |
| `base64Data`     | string  | 是       | 长分享码 (Base64编码的文件结构数据)。                                   |
| `shareProject`   | boolean | 否       | 是否加入资源共享计划 (默认为 `false`)。`true` 则待审核，`false` 则为私密。 |

**响应内容 (JSON)**
| 字段名     | 类型   | 描述                                                                            |
|------------|--------|---------------------------------------------------------------------------------|
| `isFinish` | boolean| `True` 表示提交成功并返回短码；`False` 表示失败。                                     |
| `message`  | string | 如果成功，是生成的短分享码 (SHA256哈希值)；如果失败，是错误信息或操作结果日志的摘要。 |

**成功响应示例 (新提交):**
```json
{
    "isFinish": true,
    "message": "生成的短分享码hash..."
}
```
**失败响应示例 (或已存在但根据策略未重复添加):**
```json
{
    "isFinish": false,
    "message": "数据库中已存在具有相同内容的分享 (Hash: a1b2c3d4...). 根据当前策略，未修改数据库记录。您可以使用现有短分享码。"
}
```
**状态码:**
*   `200 OK`: 成功处理（可能表示新提交成功，或检测到重复但短码有效）。
*   `400 Bad Request`: 请求参数错误。
*   `409 Conflict`: 如果处理数据库存储时发生冲突，且认为不是严重错误（例如，记录已存在并按策略处理）。
*   `500 Internal Server Error`: 服务器内部错误。

---

### GET /api/list_public_shares (列出公共资源)
分页列出公共资源库中所有已审核通过的分享。

**请求参数 (Query Parameters)**
| 参数名称 | 类型    | 是否必填 | 描述         |
|----------|---------|----------|--------------|
| `page`   | integer | 否       | 页码，默认为 1 |

**响应内容 (JSON)**
| 字段名    | 类型           | 描述                                                              |
|-----------|----------------|-------------------------------------------------------------------|
| `success` | boolean        | `True` 表示获取成功；`False` 表示发生错误。                           |
| `files`   | array of objects | 当前页的分享列表。每个对象包含 `name`, `codeHash`, `timestamp` 字段。 |
| `end`     | boolean        | 是否已到达最后一页。                                                 |
| `message` | string         | 如果 `success` 为 `False`，则包含错误信息。                           |

**成功响应示例:**
```json
{
    "success": true,
    "files": [
        {
            "name": "公开分享1",
            "codeHash": "hash1...",
            "timestamp": "YYYY-MM-DD HH:MM:SS"
        },
        {
            "name": "公开分享2",
            "codeHash": "hash2...",
            "timestamp": "YYYY-MM-DD HH:MM:SS"
        }
    ],
    "end": false
}
```
**失败响应示例:**
```json
{
    "success": false,
    "message": "获取公共分享列表失败: ...",
    "files": [],
    "end": true
}
```
**状态码:**
*   `200 OK`: 成功获取列表。
*   `500 Internal Server Error`: 服务器内部错误。

---

## 管理后台API

### 通用说明：管理员认证
所有管理后台API都需要管理员已登录。认证通过会话 (session) 和 cookie 进行。如果未认证，访问受保护的API将导致重定向到登录页面或返回错误。`{ADMIN_ENTRY}` 是在 `settings.yaml` 中配置的管理员入口路径。

---

### GET /api/{ADMIN_ENTRY}/get_shares (获取分享列表)
根据状态（已批准、待审核、私密）分页获取分享列表。

**请求参数 (Query Parameters)**
| 参数名称 | 类型    | 是否必填 | 描述                                                     |
|----------|---------|----------|----------------------------------------------------------|
| `status` | string  | 是       | 状态筛选器，可选值为: `approved` (已批准), `pending` (待审核), `private` (私密)                              |
| `page`   | integer | 否       | 页码，默认为 1                                              |

**响应内容 (JSON)**
| 字段名    | 类型           | 描述                                                                                                                                |
|-----------|----------------|-------------------------------------------------------------------------------------------------------------------------------------|
| `success` | boolean        | `True` 表示获取成功；`False` 表示失败。                                                                                                  |
| `shares`  | array of objects | 分享列表。每个对象包含 `codeHash`, `rootFolderName`, `shareCode` (长码), `timeStamp`, `visibleFlag` (Python bool `True`/`False` 或 `None`)。 |
| `end`     | boolean        | 是否为最后一页。                                                                                                                       |
| `message` | string         | 如果 `success` 为 `False`，包含错误信息。                                                                                                |

**成功响应示例:**
```json
{
    "success": true,
    "shares": [
        {
            "codeHash": "hash1...",
            "rootFolderName": "已批准的分享",
            "shareCode": "longsharecode1...",
            "timeStamp": "YYYY-MM-DD HH:MM:SS",
            "visibleFlag": true
        }
    ],
    "end": false
}
```
**状态码:**
*   `200 OK`: 成功。
*   `400 Bad Request`: 参数错误（如 `status` 无效）。
*   `401 Unauthorized` / `403 Forbidden`: (如果通过 session 检查失败，Flask 通常会重定向，但API直接调用可能返回此类错误)。
*   `500 Internal Server Error`: 服务器错误。

---

### POST /api/{ADMIN_ENTRY}/update_share_status (更新分享状态)
更新指定分享的状态 (可见性)。

**请求参数 (JSON Body)**
| 参数名称    | 类型   | 是否必填 | 描述                                                                 |
|-------------|--------|----------|----------------------------------------------------------------------|
| `codeHash`  | string | 是       | 要更新状态的分享的短码。                                                   |
| `newStatus` | string | 是       | 新的状态，可选值为: `approved` (设为公开), `pending` (设为待审核), `private` (设为私密)。 |

**响应内容 (JSON)**
| 字段名    | 类型   | 描述                                                       |
|-----------|--------|------------------------------------------------------------|
| `success` | boolean| `True` 表示更新成功；`False` 表示失败。                         |
| `message` | string | 操作结果信息。                                                |

**成功响应示例:**
```json
{
    "success": true,
    "message": "分享状态更新成功。"
}
```
**状态码:**
*   `200 OK`: 成功。
*   `400 Bad Request`: 参数错误。
*   `500 Internal Server Error`: 更新失败或服务器错误。

---

### POST /api/{ADMIN_ENTRY}/update_share_name (更新分享名称)
更新指定分享的 `rootFolderName` (分享名)。

**请求参数 (JSON Body)**
| 参数名称   | 类型   | 是否必填 | 描述                         |
|------------|--------|----------|------------------------------|
| `codeHash` | string | 是       | 要更新名称的分享的短码。           |
| `newName`  | string | 是       | 新的分享名称（原始未清理的字符串）。 |

**响应内容 (JSON)**
| 字段名        | 类型   | 描述                                                          |
|---------------|--------|---------------------------------------------------------------|
| `success`     | boolean| `True` 表示更新成功；`False` 表示失败。                            |
| `message`     | string | 操作结果信息。                                                   |
| `cleanedName` | string | (可选) 如果成功，返回清理后的新名称。                             |

**成功响应示例:**
```json
{
    "success": true,
    "message": "分享名称更新成功。",
    "cleanedName": "清理后的新名称"
}
```
**状态码:**
*   `200 OK`: 成功。
*   `400 Bad Request`: 参数错误。
*   `500 Internal Server Error`: 更新失败或服务器错误。

---

### POST /api/{ADMIN_ENTRY}/delete_share (删除分享)
从数据库中删除指定的分享记录。

**请求参数 (JSON Body)**
| 参数名称   | 类型   | 是否必填 | 描述                   |
|------------|--------|----------|------------------------|
| `codeHash` | string | 是       | 要删除的分享的短码。       |

**响应内容 (JSON)**
| 字段名    | 类型   | 描述                                            |
|-----------|--------|-------------------------------------------------|
| `success` | boolean| `True` 表示删除成功；`False` 表示失败。              |
| `message` | string | 操作结果信息。                                     |

**成功响应示例:**
```json
{
    "success": true,
    "message": "分享记录删除成功。"
}
```
**失败响应示例 (记录不存在):**
```json
{
    "success": false,
    "message": "记录删除失败，可能该记录不存在。"
}
```
**状态码:**
*   `200 OK`: 成功。
*   `400 Bad Request`: 参数错误。
*   `404 Not Found`: 记录未找到。
*   `500 Internal Server Error`: 删除失败或服务器错误。

---

### POST /api/{ADMIN_ENTRY}/update_database (从远程更新数据库)
触发服务器从预设的远程地址下载最新的数据库文件，并将其内容合并到现有的主数据库中。

**请求参数 (JSON Body)**
无特定请求体参数，请求本身即为操作指令。

**响应内容 (JSON)**
每个JSON对象包含以下字段：
| 字段名     | 类型    | 描述                                     |
|------------|---------|------------------------------------------|
| `isFinish` | boolean | `True` 表示数据库更新成功；`False` 表示失败。 |
| `message`  | string  | 操作结果信息。                             |

**成功响应示例:**
```json
{
    "isFinish": true,
    "message": "数据库已成功更新。"
}
```
**失败响应示例:**
```json
{
    "isFinish": false,
    "message": "数据库更新失败: [具体的错误信息]"
}
```
**状态码:**
*   `200 OK`: 更新流程成功完成。
*   `500 Internal Server Error`: 更新过程中发生错误（如下载失败、导入失败等）。
