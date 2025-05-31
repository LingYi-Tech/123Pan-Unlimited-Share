# [123云盘](https://www.123pan.com) 无限制分享工具（API接口文档）

## 目录

- [123云盘 无限制分享工具（API接口文档）](#123云盘-无限制分享工具api接口文档)
  - [目录](#目录)
  - [对接机器人相关](#对接机器人相关)
    - [通用说明：排队机制与响应格式](#通用说明排队机制与响应格式)
    - [1. 导出网盘内文件/目录 (Export)](#1-导出网盘内文件目录-export)
    - [2. 导入分享码到网盘 (Import)](#2-导入分享码到网盘-import)
    - [3. 导出分享链接内容 (Link)](#3-导出分享链接内容-link)
  - [公共资源库相关](#公共资源库相关)
    - [1. 列出公共分享 (List Public Shares)](#1-列出公共分享-list-public-shares)
    - [2. 搜索公共分享 (Search Database)](#2-搜索公共分享-search-database)
    - [3. 获取分享内容的目录树 (Get Content Tree)](#3-获取分享内容的目录树-get-content-tree)
    - [4. 获取完整分享码 (Get Share Code)](#4-获取完整分享码-get-share-code)
    - [5. 提交分享到数据库 (Submit to Database)](#5-提交分享到数据库-submit-to-database)
  - [数据格式转换相关](#数据格式转换相关)
    - [1. 本地分享码转为123FastLink JSON (Transform to 123FastLink)](#1-本地分享码转为123fastlink-json-transform-to-123fastlink)
    - [2. 123FastLink JSON转为本地分享码 (Transform from 123FastLink)](#2-123fastlink-json转为本地分享码-transform-from-123fastlink)

---

## 对接机器人相关

### 通用说明：排队机制与响应格式

`export`, `import`, `link` 这三个API接口在服务器端执行时，如果涉及到与123云盘官方API的交互（例如登录、列出文件、导入文件等），会将请求加入一个任务队列中排队执行。这样做是为了避免因短时间内向123云盘API发送过多请求而导致服务器IP被暂时封禁或限制。

**响应格式 (MIME Type: `application/x-ndjson`)**:
客户端会收到流式的NDJSON (Newline Delimited JSON) 响应。每个JSON对象代表一个状态更新或最终结果，并以换行符 `\n` 分隔。

**通用事件对象结构**:
```json
{
  "isFinish": null | false | true,
  "message": "状态描述或最终结果"
}
```
-   `isFinish: null`: 表示操作正在进行中，`message` 字段是当前进度的文本描述。
-   `isFinish: false`: 表示操作因错误而终止，`message` 字段是错误信息的文本描述。
-   `isFinish: true`: 表示操作成功完成。
    -   对于 `export` 和 `link`，`message` 字段是一个JSON字符串，其中包含 `longShareCode` (长分享码) 和可选的 `shortShareCode` (短分享码，如果生成了)。
    -   对于 `import`，`message` 字段是导入成功后的提示信息字符串。


### 1. 导出网盘内文件/目录 (Export)

-   **Endpoint**: `POST /api/export`
-   **描述**: 导出用户123云盘指定路径下的文件/文件夹结构为自定义的长分享码。可以选择生成短分享码并加入公共资源共享计划。
-   **排队**: 是

**请求参数 (application/json)**:

| 名称                  | 类型    | 是否必需 | 描述                                                                 |
| --------------------- | ------- | -------- | -------------------------------------------------------------------- |
| `username`            | String  | 是       | 123云盘用户名/邮箱                                                       |
| `password`            | String  | 是       | 123云盘密码                                                            |
| `homeFilePath`        | String  | 否       | 要导出的123云盘内文件夹ID，默认为 "0" (根目录)。                         |
| `userSpecifiedBaseName` | String  | 否       | 用户为此分享指定的根目录名。如果`generateShortCode`为`true`，此项建议填写。 |
| `generateShortCode`   | Boolean | 否       | 是否生成短分享码并存入数据库。默认为 `false`。若`shareProject`为`true`，此项强制为`true`。 |
| `shareProject`        | Boolean | 否       | 是否将此分享加入公共资源共享计划（待审核）。默认为 `false`。如果为 `true`，则 `userSpecifiedBaseName` 必须提供。 |

**请求示例**:
```json
{
  "username": "user@example.com",
  "password": "yourpassword",
  "homeFilePath": "123456789",
  "userSpecifiedBaseName": "我的番剧收藏",
  "generateShortCode": true,
  "shareProject": true
}
```

**响应示例 (application/x-ndjson 流式)**:
```json
{"isFinish": null, "message": "任务已添加: xxxxx, 名称: 导出_user@..., 队列长度: 1"}
{"isFinish": null, "message": "恭喜! 哥们运气真好, 前面竟然 0 人排队! ..."}
{"isFinish": null, "message": "准备登录..."}
{"isFinish": null, "message": "登录成功，开始导出文件列表..."}
{"isFinish": null, "message": "获取文件列表中：parentFileId: 123456789"}
{"isFinish": null, "message": "读取文件夹中..."}
{"isFinish": null, "message": "数据清洗中..."}
{"isFinish": null, "message": "数据匿名化中..."}
{"isFinish": null, "message": "文件列表从123网盘导出成功。正在进一步处理..."}
{"isFinish": null, "message": "正在处理数据库存储与短分享码..."}
{"isFinish": null, "message": "成功将新分享作为公共待审核项 (根目录名: 我的番剧收藏) 存入数据库。"}
{"isFinish": null, "message": "短分享码处理完成。短码为: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"}
{"isFinish": true, "message": "{\"longShareCode\": \"eyJ...农业\", \"shortShareCode\": \"a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\"}"}
```
如果失败:
```json
{"isFinish": null, "message": "准备登录..."}
{"isFinish": false, "message": "登录失败，请检查用户名和密码。"}
```

**最终成功响应的 message 字段内容 (JSON字符串)**:

| 名称             | 类型   | 描述                                           |
| ---------------- | ------ | ---------------------------------------------- |
| `longShareCode`  | String | Base64编码的长分享码。                           |
| `shortShareCode` | String | (可选) 64位字符的短分享码，如果生成了。 |

### 2. 导入分享码到网盘 (Import)

-   **Endpoint**: `POST /api/import`
-   **描述**: 将提供的长分享码或短分享码的内容导入到用户的123云盘中。
-   **排队**: 是

**请求参数 (application/json)**:

*   情况一：使用短分享码导入
    | 名称       | 类型   | 是否必需 | 描述                                                              |
    | ---------- | ------ | -------- | ----------------------------------------------------------------- |
    | `username` | String | 是       | 123云盘用户名/邮箱                                                  |
    | `password` | String | 是       | 123云盘密码                                                       |
    | `codeHash` | String | 是       | 要导入的短分享码 (64位哈希值)。                                       |
*   情况二：使用长分享码导入
    | 名称             | 类型    | 是否必需 | 描述                                                                 |
    | ---------------- | ------- | -------- | -------------------------------------------------------------------- |
    | `username`       | String  | 是       | 123云盘用户名/邮箱                                                       |
    | `password`       | String  | 是       | 123云盘密码                                                            |
    | `base64Data`     | String  | 是       | Base64编码的长分享码。                                                 |
    | `rootFolderName` | String  | 是       | 在123云盘根目录下创建的导入文件夹的名称。                                |
    | `shareProject`   | Boolean | 否       | (仅长码导入时) 是否将此长码也存入共享计划数据库（待审核）。默认为 `false`。 |

**请求示例 (短码)**:
```json
{
  "username": "user@example.com",
  "password": "yourpassword",
  "codeHash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
}
```
**请求示例 (长码)**:
```json
{
  "username": "user@example.com",
  "password": "yourpassword",
  "base64Data": "eyJGaWxlSWQiOiAwLCAiRmlsZU5hbWUiOiAi5oiR55qE55S15YqbIiwgIlR5cGUiOiAxLCAiU2l6ZSI6IDAsICJFdGFnIjogIiIsICJwYXJlbnRGaWxlSWQiOiAtMSwgIkFic1BhdGgiOiAiMCJ9...",
  "rootFolderName": "从长码导入的番剧",
  "shareProject": false
}
```

**响应示例 (application/x-ndjson 流式)**:
```json
{"isFinish": null, "message": "任务已添加: yyyyy, 名称: 导入_user@..., 队列长度: 1"}
{"isFinish": null, "message": "恭喜义父, 轮到您嘞! 操作即将开始..."}
{"isFinish": null, "message": "准备登录到123网盘..."}
{"isFinish": null, "message": "登录成功，准备导入数据..."}
// (如果是短码) {"isFinish": null, "message": "正在通过短分享码 a1b2c3d4... 从数据库获取数据..."}
// (如果是短码) {"isFinish": null, "message": "从数据库获取数据成功，将导入为：我的番剧收藏"}
// (如果是长码且shareProject=true) {"isFinish": null, "message": "已勾选加入资源共享计划，正在将此长分享码存入数据库..."}
{"isFinish": null, "message": "正在读取数据..."}
{"isFinish": null, "message": "数据读取完成"}
{"isFinish": null, "message": "正在清洗数据..."}
{"isFinish": null, "message": "数据清洗完成"}
{"isFinish": null, "message": "正在重建目录结构..."}
{"isFinish": null, "message": "[1/5][速度: 0.50 个/秒][预估剩余时间: 8.00 秒] 正在创建文件夹: 子文件夹1"}
...
{"isFinish": null, "message": "目录结构重建完成"}
{"isFinish": null, "message": "正在上传文件..."}
{"isFinish": null, "message": "[1/10][速度: 1.00 个/秒][预估剩余时间: 9.00 秒] 正在上传文件: 文件1.mp4"}
...
{"isFinish": null, "message": "文件上传完成"}
{"isFinish": true, "message": "导入完成, 保存到123网盘根目录中的: >>> 我的番剧收藏_20230101120000_GitHub@realcwj <<< 文件夹"}
```
如果失败:
```json
{"isFinish": false, "message": "登录123网盘失败，请检查用户名和密码。"}
```
或者
```json
{"isFinish": false, "message": "短分享码无效或未在数据库中找到。"}
```

### 3. 导出分享链接内容 (Link)

-   **Endpoint**: `POST /api/link`
-   **描述**: 从一个公开的123云盘分享链接（可能带密码）中导出其内容为自定义的长分享码。可以选择生成短分享码并加入公共资源共享计划。
-   **排队**: 是

**请求参数 (application/json)**:

| 名称                  | 类型    | 是否必需 | 描述                                                                     |
| --------------------- | ------- | -------- | ------------------------------------------------------------------------ |
| `shareKey`            | String  | 是       | 123云盘分享链接的Key部分 (例如 `s/xxxxxx` 中的 `xxxxxx`)。                    |
| `sharePwd`            | String  | 否       | 分享链接的密码 (如果有)。                                                      |
| `parentFileId`        | String  | 否       | (高级) 如果分享链接内有多个文件/文件夹，指定从哪个文件夹ID开始导出，默认为 "0" (分享链接的根)。 |
| `userSpecifiedBaseName` | String  | 否       | 用户为此分享指定的根目录名。如果`generateShortCode`为`true`，此项建议填写。     |
| `generateShortCode`   | Boolean | 否       | 是否生成短分享码并存入数据库。默认为 `false`。若`shareProject`为`true`，此项强制为`true`。     |
| `shareProject`        | Boolean | 否       | 是否将此分享加入公共资源共享计划（待审核）。默认为 `false`。如果为 `true`，则 `userSpecifiedBaseName` 必须提供。 |

**请求示例**:
```json
{
  "shareKey": "abcdefg",
  "sharePwd": "mima",
  "parentFileId": "0",
  "userSpecifiedBaseName": "教程视频合集",
  "generateShortCode": true,
  "shareProject": true
}
```

**响应示例 (application/x-ndjson 流式)**: (与 `/api/export` 类似)
```json
{"isFinish": null, "message": "任务已添加: zzzzz, 名称: 链接导出_abcdefg..., 队列长度: 1"}
{"isFinish": null, "message": "恭喜义父, 轮到您嘞! 操作即将开始..."}
{"isFinish": null, "message": "开始从分享链接导出文件列表..."}
{"isFinish": null, "message": "获取文件列表中：parentFileId: 0"}
...
{"isFinish": null, "message": "文件列表从分享链接导出成功。正在进一步处理..."}
{"isFinish": null, "message": "正在处理数据库存储与短分享码..."}
{"isFinish": null, "message": "短分享码处理完成。短码为: f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6"}
{"isFinish": true, "message": "{\"longShareCode\": \"eyJh...XYZ\", \"shortShareCode\": \"f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6\"}"}
```
如果失败:
```json
{"isFinish": false, "message": "获取文件列表失败：{\"code\":10003,\"message\":\"提取码错误\",\"data\":null}"}
```

**最终成功响应的 message 字段内容 (JSON字符串)**:

| 名称             | 类型   | 描述                                           |
| ---------------- | ------ | ---------------------------------------------- |
| `longShareCode`  | String | Base64编码的长分享码。                           |
| `shortShareCode` | String | (可选) 64位字符的短分享码，如果生成了。 |

---

## 公共资源库相关

### 1. 列出公共分享 (List Public Shares)

-   **Endpoint**: `GET /api/list_public_shares`
-   **描述**: 获取已通过审核并公开的分享列表，支持分页。
-   **排队**: 否

**请求参数 (URL Query String)**:

| 名称   | 类型 | 是否必需 | 描述                             |
| ------ | ---- | -------- | -------------------------------- |
| `page` | Int  | 否       | 请求的页码，默认为 `1`。           |

**请求示例**:
`GET /api/list_public_shares?page=2`

**响应参数 (application/json)**:

| 名称    | 类型          | 描述                                                         |
| ------- | ------------- | ------------------------------------------------------------ |
| `success` | Boolean       | 操作是否成功。                                                 |
| `files`   | Array<Object> | 分享文件对象列表。每个对象包含 `name`, `codeHash`, `timestamp`。 |
| `end`     | Boolean       | 是否已到达最后一页。                                           |
| `message` | String        | (可选) 如果 `success` 为 `false`，则包含错误信息。             |

**分享文件对象结构**:

| 名称        | 类型   | 描述         |
| ----------- | ------ | ------------ |
| `name`      | String | 分享的根目录名 |
| `codeHash`  | String | 短分享码     |
| `timestamp` | String | 时间戳       |

**响应示例 (成功)**:
```json
{
  "success": true,
  "files": [
    {
      "name": "演示文件合集",
      "codeHash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      "timestamp": "2023-10-27 10:00:00"
    },
    {
      "name": "学习资料",
      "codeHash": "f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6",
      "timestamp": "2023-10-26 15:30:00"
    }
  ],
  "end": false
}
```
**响应示例 (失败)**:
```json
{
  "success": false,
  "message": "获取公共分享列表失败: 数据库连接错误",
  "files": [],
  "end": true
}
```

### 2. 搜索公共分享 (Search Database)

-   **Endpoint**: `POST /api/search_database`
-   **描述**: 根据关键词模糊搜索已通过审核并公开的分享，支持分页。
-   **排队**: 否

**请求参数 (application/json)**:

| 名称             | 类型   | 是否必需 | 描述                             |
| ---------------- | ------ | -------- | -------------------------------- |
| `rootFolderName` | String | 是       | 搜索的关键词 (匹配分享的根目录名)。 |
| `page`           | Int    | 否       | 请求的页码，默认为 `1`。           |

**请求示例**:
```json
{
  "rootFolderName": "教程",
  "page": 1
}
```

**响应参数 (application/json)**: (同 `/api/list_public_shares` 的响应结构)

| 名称    | 类型          | 描述                                                         |
| ------- | ------------- | ------------------------------------------------------------ |
| `success` | Boolean       | 操作是否成功。                                                 |
| `files`   | Array<Object> | 搜索到的分享文件对象列表。每个对象包含 `name`, `codeHash`, `timestamp`。 |
| `end`     | Boolean       | 是否已到达搜索结果的最后一页。                                 |
| `message` | String        | (可选) 如果 `success` 为 `false`，则包含错误信息。             |

**响应示例 (成功)**:
```json
{
  "success": true,
  "files": [
    {
      "name": "Python入门教程",
      "codeHash": "caffeebeefcafeebabedead123456789012345678901234567890123456789012",
      "timestamp": "2023-10-25 12:00:00"
    }
  ],
  "end": true
}
```

### 3. 获取分享内容的目录树 (Get Content Tree)

-   **Endpoint**: `POST /api/get_content_tree`
-   **描述**: 根据短分享码或直接提供的长分享码，获取其内容的目录树结构。
-   **排队**: 否

**请求参数 (application/json)**:
(二选一提供)
| 名称        | 类型   | 是否必需 | 描述                                     |
| ----------- | ------ | -------- | ---------------------------------------- |
| `codeHash`  | String | 可选     | 短分享码 (64位哈希值)。                    |
| `shareCode` | String | 可选     | Base64编码的长分享码。                   |

**请求示例 (使用短码)**:
```json
{
  "codeHash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
}
```
**请求示例 (使用长码)**:
```json
{
  "shareCode": "eyJGaWxlSWQiOiAwLCAiRmlsZU5hbWUiOiAi5oiR55qE55S15YqbIiwgIlR5cGUiOiAxLCAiU2l6ZSI6IDAsICJFdGFnIjogIiIsICJwYXJlbnRGaWxlSWQiOiAtMSwgIkFic1BhdGgiOiAiMCJ9..."
}
```

**响应参数 (application/json)**:

| 名称      | 类型          | 描述                                                   |
| --------- | ------------- | ------------------------------------------------------ |
| `isFinish`  | Boolean       | 操作是否成功获取并生成目录树。                             |
| `message`   | Array<String> / String | 如果 `isFinish` 为 `true`，是表示目录树的字符串数组。如果为 `false`，是错误信息字符串。 |

**响应示例 (成功)**:
```json
{
  "isFinish": true,
  "message": [
    "📂 我的合集",
    "├── 📄 文件1.txt",
    "├── 🖼️ 图片.jpg",
    "└── 📂 子目录",
    "    └── 🎥 视频.mp4"
  ]
}
```
**响应示例 (失败)**:
```json
{
  "isFinish": false,
  "message": "错误：未找到与提供的短分享码 a1b2c3d4... 对应的分享内容。"
}
```

### 4. 获取完整分享码 (Get Share Code)

-   **Endpoint**: `POST /api/get_sharecode`
-   **描述**: 根据短分享码从数据库获取对应的完整长分享码。
-   **排队**: 否

**请求参数 (application/json)**:

| 名称       | 类型   | 是否必需 | 描述                   |
| ---------- | ------ | -------- | ---------------------- |
| `codeHash` | String | 是       | 短分享码 (64位哈希值)。 |

**请求示例**:
```json
{
  "codeHash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
}
```

**响应参数 (application/json)**:

| 名称      | 类型   | 描述                                                             |
| --------- | ------ | ---------------------------------------------------------------- |
| `isFinish`  | Boolean | 操作是否成功找到并返回长分享码。                                   |
| `message`   | String | 如果 `isFinish` 为 `true`，是Base64编码的长分享码。如果为 `false`，是错误信息。 |

**响应示例 (成功)**:
```json
{
  "isFinish": true,
  "message": "eyJGaWxlSWQiOiAwLCAiRmlsZU5hbWUiOiAi5oiR55qE55S15YqbIiwgIlR5cGUiOiAxLCAiU2l6ZSI6IDAsICJFdGFnIjogIiIsICJwYXJlbnRGaWxlSWQiOiAtMSwgIkFic1BhdGgiOiAiMCJ9..."
}
```
**响应示例 (失败)**:
```json
{
  "isFinish": false,
  "message": "未找到与提供的短分享码 a1b2c3d4... 对应的分享内容。"
}
```

### 5. 提交分享到数据库 (Submit to Database)

-   **Endpoint**: `POST /api/submit_database`
-   **描述**: 将用户提供的长分享码和根目录名提交到数据库。如果选择加入共享计划，则该分享将等待管理员审核。
-   **排队**: 否

**请求参数 (application/json)**:

| 名称             | 类型    | 是否必需 | 描述                                                              |
| ---------------- | ------- | -------- | ----------------------------------------------------------------- |
| `rootFolderName` | String  | 是       | 为此分享指定的根目录名。                                              |
| `base64Data`     | String  | 是       | Base64编码的长分享码。                                              |
| `shareProject`   | Boolean | 否       | 是否将此分享加入公共资源共享计划（待审核）。默认为 `false`。如果为 `true`，则`visibleFlag`最终为`None`（待审核），否则为`False`（私密）。 |

**请求示例**:
```json
{
  "rootFolderName": "我的工具包",
  "base64Data": "eyJGaWxlS....9Abc=",
  "shareProject": true
}
```

**响应参数 (application/json)**:

| 名称      | 类型   | 描述                                                                       |
| --------- | ------ | -------------------------------------------------------------------------- |
| `isFinish`  | Boolean | 操作是否成功。                                                               |
| `message`   | String | 如果 `isFinish` 为 `true`，是生成的短分享码。如果为 `false`，是错误信息。    |

**响应示例 (成功)**:
```json
{
  "isFinish": true,
  "message": "c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6"
}
```
**响应示例 (已存在但仍成功返回短码)**:
```json
{
  "isFinish": true,
  "message": "c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6"
}
```
*注意: `handle_database_storage` 逻辑表明，即使分享已存在，只要短码有效，仍可能返回 `isFinish: true` 和短码。*

**响应示例 (失败)**:
```json
{
  "isFinish": false,
  "message": "数据库操作失败。"
}
```

---

## 数据格式转换相关

### 1. 本地分享码转为123FastLink JSON (Transform to 123FastLink)

-   **Endpoint**: `POST /api/transformShareCodeTo123FastLinkJson`
-   **描述**: 将本工具生成的长分享码和指定的根目录名转换为 [123FL](https://github.com/rzlib/123FL/) (123FastLink) 兼容的JSON格式。
-   **排队**: 否

**请求参数 (application/json)**:

| 名称             | 类型   | 是否必需 | 描述                                            |
| ---------------- | ------ | -------- | ----------------------------------------------- |
| `shareCode`      | String | 是       | Base64编码的长分享码。                            |
| `rootFolderName` | String | 是       | 此分享的根目录名，将用作123FastLink的 `commonPath`。 |

**请求示例**:
```json
{
  "shareCode": "eyJGaWxlS....9Abc=",
  "rootFolderName": "电影合集"
}
```

**响应参数 (application/json)**:

| 名称      | 类型   | 描述                                                                         |
| --------- | ------ | ---------------------------------------------------------------------------- |
| `isFinish`  | Boolean | 转换操作是否成功。                                                             |
| `message`   | Object / String | 如果 `isFinish` 为 `true`，是转换后的123FastLink JSON对象。如果为 `false`，是错误信息。 |

**响应示例 (成功)**:
```json
{
  "isFinish": true,
  "message": {
    "scriptVersion": "114514",
    "exportVersion": "114514",
    "usesBase62EtagsInExport": true,
    "commonPath": "电影合集/",
    "files": [
      {
        "path": "阿凡达/阿凡达.mkv",
        "size": 10737418240,
        "etag": "Abc123Xyz"
      },
      {
        "path": "阿凡达/封面.jpg",
        "size": 204800,
        "etag": "Def456Uvw"
      }
    ]
  }
}
```
**响应示例 (失败)**:
```json
{
  "isFinish": false,
  "message": "无法解析提供的shareCode (可能不是有效的Base64编码的JSON): Expecting value: line 1 column 1 (char 0)"
}
```

### 2. 123FastLink JSON转为本地分享码 (Transform from 123FastLink)

-   **Endpoint**: `POST /api/transform123FastLinkJsonToShareCode`
-   **描述**: 将 [123FL](https://github.com/rzlib/123FL/) (123FastLink) 导出的JSON数据（字符串形式）转换为本工具使用的长分享码格式。如果123FastLink的JSON中 `commonPath` 为空，则会为每个顶级目录生成单独的分享码。可以选择将生成的分享码存入数据库。
-   **排队**: 否

**请求参数 (application/json)**:

| 名称                | 类型    | 是否必需 | 描述                                                                   |
| ------------------- | ------- | -------- | ---------------------------------------------------------------------- |
| `123FastLinkJson`   | String  | 是       | 123FastLink导出的JSON数据的字符串表示。                                    |
| `generateShortCode` | Boolean | 否       | 是否为生成的每个分享码都生成短码并存入数据库。默认为 `false`。                 |
| `shareProject`      | Boolean | 否       | (仅当`generateShortCode`为`true`时有效) 是否将生成的分享码加入共享计划（待审核）。默认为`false`。若为`true`，`generateShortCode`强制为`true`。 |

**请求示例**:
```json
{
  "123FastLinkJson": "{\"scriptVersion\":\"1.0.3\",\"exportVersion\":\"2\",\"usesBase62EtagsInExport\":true,\"commonPath\":\"我的资源/\",\"files\":[{\"path\":\"电影/黑客帝国.mkv\",\"size\":12345678,\"etag\":\"RAndomEtagStrnG\"}]}",
  "generateShortCode": true,
  "shareProject": false 
}
```

**响应参数 (application/json)**:

| 名称      | 类型          | 描述                                                                                                                                  |
| --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `isFinish`  | Boolean       | 转换操作是否成功。                                                                                                                      |
| `message`   | Array<Object> / String | 如果 `isFinish` 为 `true`，是一个对象数组，每个对象包含 `rootFolderName`, `longShareCode` 和可选的 `shortShareCode`。如果为 `false`，是错误信息。 |
| `note`    | String        | (可选) 额外说明，例如当转换成功但未生成任何分享码时。 |

**转换结果对象结构 (在 `message` 数组中)**:

| 名称             | 类型   | 描述                         |
| ---------------- | ------ | ---------------------------- |
| `rootFolderName` | String | 转换后分享的根目录名。           |
| `longShareCode`  | String | 生成的Base64编码的长分享码。     |
| `shortShareCode` | String | (可选) 生成的短分享码，如果请求了。 |

**响应示例 (成功, 单个结果)**:
```json
{
  "isFinish": true,
  "message": [
    {
      "rootFolderName": "我的资源",
      "longShareCode": "eyJGaWxlS....Abc=",
      "shortShareCode": "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3"
    }
  ]
}
```
**响应示例 (成功, commonPath为空导致多个结果)**:
```json
{
  "isFinish": true,
  "message": [
    {
      "rootFolderName": "电影",
      "longShareCode": "eyJGaWxlSWQx....Xyz=",
      "shortShareCode": "hash_for_movie_share"
    },
    {
      "rootFolderName": "音乐",
      "longShareCode": "eyJGaWxlSWQy....Pqr=",
      "shortShareCode": "hash_for_music_share"
    }
  ]
}
```
**响应示例 (失败)**:
```json
{
  "isFinish": false,
  "message": "无法解析提供的123FastLinkJson (它应该是一个JSON字符串): Expecting value: line 1 column 1 (char 0)"
}
```