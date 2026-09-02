# dsh-side-panels

DSH 会话工作台：每条对话旁边一套文件树和终端。

这是社区插件，不是 DeepSeek 官方项目。

## 安装

桌面端、网页配置档：

```text
dsh plugin --profile web add github:G-pledge/dsh-side-panels
```

装完后完全退出桌面端再打开。设置左边会出现「工作台」。

卸载：

```text
dsh plugin --profile web remove dsh-side-panels
```

## 说明

- 开关、配色、默认终端改完会自动记下，没有单独的保存按钮。
- 换终端后，把终端页关掉再开一次才生效。
- 自定义终端可填 `Cmder.exe` 这类本机程序。
- Windows 上第一次安装可能会编译本机终端组件，需要基本的编译环境。
