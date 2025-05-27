# [123云盘](https://www.123pan.com) 无限制分享工具（API接口文档）

## 目录
- [123云盘 无限制分享工具（API接口文档）](#123云盘-无限制分享工具api接口文档)
  - [目录](#目录)
  - [1. `/api/export`：从私人网盘导出](#1-apiexport从私人网盘导出)
  - [2. `/api/import`：导入到私人网盘](#2-apiimport导入到私人网盘)
  - [3. `/api/link`：从分享链接导出](#3-apilink从分享链接导出)
  - [4. `/api/list_public_shares`：获取公共分享列表](#4-apilist_public_shares获取公共分享列表)
  - [5. `/api/get_content_tree`：获取分享内容的目录树](#5-apiget_content_tree获取分享内容的目录树)

## 1. `/api/export`：从私人网盘导出

此接口用于从用户的123云盘账户中导出指定文件夹（或整个网盘）的内容，并生成一个长分享码（Base64编码的JSON数据）。可选地，可以将此分享码存入本站数据库以生成一个短分享码，并/或将其加入资源共享计划（公开可见，需审核）。

- **路径：** `/api/export`
- **方法：** `POST`
- **请求头：**
    - `Content-Type: application/json`
- **请求体 (JSON)：**
    ```json
    {
        "username": "你的123网盘账号（手机号/邮箱）",
        "password": "你的123网盘密码",
        "homeFilePath": "要分享的文件夹ID",
        "userSpecifiedBaseName": "用户指定的分享根目录名（可选）",
        "generateShortCode": false,
        "shareProject": false
    }
    ```
    - `username` (string, 必填): 123云盘账户的登录用户名（手机号或邮箱）。
    - `password` (string, 必填): 123云盘账户的登录密码。
    - `homeFilePath` (string/integer, 必填): 要导出的文件夹ID。如果分享整个网盘，则填 `0`。
    - `userSpecifiedBaseName` (string, 可选): 用户为此次分享指定的根目录名称。如果留空，且需要生成短分享码或加入共享计划，系统可能会使用默认名称（如基于时间戳）。如果 `shareProject` 为 `true`，此项变为必填。
    - `generateShortCode` (boolean, 可选, 默认 `false`): 是否生成短分享码。如果为 `true`，导出的长分享码将被存储在本站数据库，并返回一个短哈希码。
    - `shareProject` (boolean, 可选, 默认 `false`): 是否加入资源共享计划。如果为 `true`，此分享将提交审核，通过后对所有用户公开可见。勾选此项会强制 `generateShortCode` 为 `true`，并且 `userSpecifiedBaseName` 成为必填项。

- **响应 (application/x-ndjson - Newline Delimited JSON):**
  服务器会以流的形式返回一系列JSON对象，每个对象占一行。
    - **进度消息 (isFinish: null):**
        ```json
        {"isFinish": null, "message": "登录成功，开始导出文件列表..."}
        {"isFinish": null, "message": "读取文件夹中..."}
        {"isFinish": null, "message": "正在生成短分享码并存储..."}
        ```
        - `isFinish`: `null` 表示操作正在进行中。
        - `message` (string): 当前操作的状态或日志信息。

    - **成功 (isFinish: true):**
        ```json
        {"isFinish": true, "message": "{\"longShareCode\": \"BASE64_ENCODED_STRING\", \"shortShareCode\": \"HASH_STRING_IF_GENERATED\"}"}
        ```
        - `isFinish`: `true` 表示操作成功完成。
        - `message` (string - **这是一个JSON字符串，需要客户端再次解析**): 包含最终结果的JSON字符串。
            - `longShareCode` (string): Base64编码的分享数据。
            - `shortShareCode` (string, 可选): 如果请求生成了短分享码，则此字段存在。

    - **失败 (isFinish: false):**
        ```json
        {"isFinish": false, "message": "登录失败，请检查用户名和密码。"}
        {"isFinish": false, "message": "未能从123网盘获取文件数据。"}
        ```
        - `isFinish`: `false` 表示操作失败。
        - `message` (string): 错误描述信息。

- **注意事项：**
    - 密码等敏感信息仅用于当次操作，服务器不会存储。
    - 如果 `shareProject` 为 `true`，`userSpecifiedBaseName` 必须提供且不能为空。
    - 如果 `generateShortCode` 为 `true`，导出的数据（长分享码）会被存储到服务器数据库。数据的可见性取决于 `shareProject` 的值（`true` 为待审核公开，`false` 为私密短码）。

## 2. `/api/import`：导入到私人网盘

此接口用于将通过本工具生成的分享码（长码或短码）导入到用户的123云盘账户。

- **路径：** `/api/import`
- **方法：** `POST`
- **请求头：**
    - `Content-Type: application/json`
- **请求体 (JSON)：**
    ```json
    // 模式1：使用短分享码导入
    {
        "username": "你的123网盘账号",
        "password": "你的123网盘密码",
        "codeHash": "短分享码（数据库中的Hash值）"
    }

    // 模式2：使用长分享码导入
    {
        "username": "你的123网盘账号",
        "password": "你的123网盘密码",
        "base64Data": "完整的Base64长分享码",
        "rootFolderName": "要创建的根目录名",
        "shareProject": false // 可选, 是否将此长码也加入共享计划
    }
    ```
    - `username` (string, 必填): 123云盘账户的登录用户名。
    - `password` (string, 必填): 123云盘账户的登录密码。
    - **以下参数二选一提供：**
        - `codeHash` (string): 通过本站生成的短分享码。如果提供此参数，则不应提供 `base64Data` 和 `rootFolderName`。
        - 或组合：
            - `base64Data` (string): 完整的长分享码（Base64编码的JSON数据）。
            - `rootFolderName` (string): 在用户网盘中创建的顶级文件夹的名称。
            - `shareProject` (boolean, 可选, 默认 `false`): 仅当使用 `base64Data` 导入时有效。如果为 `true`，并且 `rootFolderName` 有效，则此长分享码及其指定的 `rootFolderName` 也会被提交到资源共享计划（待审核）。

- **响应 (application/x-ndjson):**
    - **进度消息 (isFinish: null):**
        ```json
        {"isFinish": null, "message": "登录成功，准备导入数据..."}
        {"isFinish": null, "message": "正在通过短分享码 29absdef... 获取数据..."}
        {"isFinish": null, "message": "[1/100][...] 正在创建文件夹: 电影"}
        ```
        - `isFinish`: `null`
        - `message` (string): 进度信息。

    - **成功 (isFinish: true):**
        ```json
        {"isFinish": true, "message": "导入完成, 保存到123网盘根目录中的: >>> 导入的分享_时间戳_GitHub@realcwj <<< 文件夹"}
        ```
        - `isFinish`: `true`
        - `message` (string): 导入成功的最终消息。

    - **失败 (isFinish: false):**
        ```json
        {"isFinish": false, "message": "登录失败，请检查用户名和密码。"}
        {"isFinish": false, "message": "短分享码无效或未在数据库中找到。"}
        {"isFinish": false, "message": "读取数据失败, 报错：..."}
        ```
        - `isFinish`: `false`
        - `message` (string): 错误信息。

- **注意事项：**
    - 如果同时提供 `codeHash` 和 `base64Data`，会优先使用 `codeHash` 或返回参数冲突错误。
    - 导入的文件会存放在用户123网盘根目录下一个新创建的文件夹内，文件夹名基于 `rootFolderName` 或短分享码对应的原始名称，并可能附加时间戳。

## 3. `/api/link`：从分享链接导出

此接口用于从一个公开的123云盘分享链接中导出其内容，并生成长分享码。同样可以选择生成短分享码或加入资源共享计划。

- **路径：** `/api/link`
- **方法：** `POST`
- **请求头：**
    - `Content-Type: application/json`
- **请求体 (JSON)：**
    ```json
    {
        "parentFileId": "要导出的分享内文件夹ID",
        "shareKey": "分享链接的Key",
        "sharePwd": "分享链接的密码（提取码，可选）",
        "userSpecifiedBaseName": "用户指定的分享根目录名（可选）",
        "generateShortCode": false,
        "shareProject": false
    }
    ```
    - `parentFileId` (string/integer, 必填): 要从分享链接中导出的文件夹ID。如果是分享链接的根目录，则填 `0`。
    - `shareKey` (string, 必填): 分享链接中的关键部分（例如，`https://www.123pan.com/s/xxxx-yyyy` 中的 `xxxx-yyyy`）。
    - `sharePwd` (string, 可选): 分享链接的提取密码。如果链接没有密码，则此字段可留空或不传。
    - `userSpecifiedBaseName` (string, 可选): 同 `/api/export` 中的定义。
    - `generateShortCode` (boolean, 可选, 默认 `false`): 同 `/api/export` 中的定义。
    - `shareProject` (boolean, 可选, 默认 `false`): 同 `/api/export` 中的定义。

- **响应 (application/x-ndjson):**
  响应格式与 `/api/export` 完全相同。
    - **进度消息 (isFinish: null):**
        ```json
        {"isFinish": null, "message": "开始从分享链接导出文件列表..."}
        ```
    - **成功 (isFinish: true):**
        ```json
        {"isFinish": true, "message": "{\"longShareCode\": \"BASE64_ENCODED_STRING\", \"shortShareCode\": \"HASH_STRING_IF_GENERATED\"}"}
        ```
    - **失败 (isFinish: false):**
        ```json
        {"isFinish": false, "message": "获取文件列表失败：{\"code\":100x, ...}"}
        ```

- **注意事项：**
    - 此接口不需要用户登录123云盘。
    - 其他关于 `userSpecifiedBaseName`, `generateShortCode`, `shareProject` 的注意事项同 `/api/export`。

## 4. `/api/list_public_shares`：获取公共分享列表

此接口用于获取数据库中所有设置为公开可见（`visibleFlag=true`，即已审核通过）的分享条目。

- **路径：** `/api/list_public_shares`
- **方法：** `GET`
- **请求头：** 无特殊要求。
- **请求体：** 无。

- **响应 (application/json):**
    - **成功 (HTTP 200):**
        ```json
        {
            "success": true,
            "files": [
                {
                    "name": "分享的电影合集",
                    "codeHash": "abcdef123456...",
                    "timestamp": "2023-10-27 10:00:00"
                },
                {
                    "name": "学习资料",
                    "codeHash": "fedcba654321...",
                    "timestamp": "2023-10-26 15:30:00"
                }
                // ... 更多分享条目
            ]
        }
        ```
        - `success` (boolean): `true` 表示请求成功。
        - `files` (array): 分享条目对象的数组。
            - `name` (string): 分享的根目录名。
            - `codeHash` (string): 短分享码。
            - `timestamp` (string): 分享条目入库的时间戳（格式如 `YYYY-MM-DD HH:MM:SS`）。列表默认按时间戳降序排列。

    - **失败 (例如 HTTP 500):**
        ```json
        {
            "success": false,
            "message": "获取公共分享列表失败: 数据库错误描述"
        }
        ```
        - `success` (boolean): `false` 表示请求失败。
        - `message` (string): 错误信息。

## 5. `/api/get_content_tree`：获取分享内容的目录树

此接口用于根据提供的短分享码或长分享码，生成对应分享内容的目录树结构。

- **路径：** `/api/get_content_tree`
- **方法：** `POST`
- **请求头：**
    - `Content-Type: application/json`
- **请求体 (JSON)：**
    ```json
    // 模式1：使用短分享码
    {
        "codeHash": "短分享码"
    }

    // 模式2：使用长分享码
    {
        "shareCode": "完整的Base64长分享码"
    }
    ```
    - **任选其一提供：**
        - `codeHash` (string): 本站生成的短分享码。
        - `shareCode` (string): 完整的长分享码（Base64编码的元数据）。

- **响应 (application/json):**
    - **成功 (HTTP 200):**
        ```json
        {
            "isFinish": true,
            "message": [
                "📂 根目录",
                "├── 📄 文件1.txt",
                "├── 🖼️ 图片.png",
                "└── 📂 子目录",
                "    └── 🎥 视频.mp4"
            ]
        }
        ```
      - `isFinish` (boolean): `true` 表示目录树生成成功。
      - `message` (array of strings): 表示目录树的字符串数组，每一项代表树中的一行。包含了Emoji图标。

    - **失败 (例如 HTTP 400, 404, 500):**
        ```json
        {
            "isFinish": false,
            "message": "错误: 未找到与提供的短分享码对应的分享内容。"
        }
        // 或
        {
            "isFinish": false,
            "message": "错误: 无效的Base64数据。"
        }
        ```
      - `isFinish` (boolean): `false` 表示目录树生成失败。
      - `message` (string): 错误描述信息。

- **注意事项：**
    - 如果同时提供了 `codeHash` 和 `shareCode`，`codeHash` 的优先级更高。
    - `generateContentTree.py` 脚本负责解析分享码并生成树形结构，支持常见文件类型的Emoji图标。