# Hi-Face-Cloudbase

#### 注意事项

  > 本代码的核心能力基于小程序云开发，如需用于其他环境请自行转译！

#### 相关配置

  - ~~cloudBucketHeader~~ 已更换为云函数
    > 位置： miniprogram/config.js
    > 
    > 请替换为自己的云存储地址
    >
    > 例如： 0000-\<envID\>.tcb.myqcloud.la/

  - env
    > 位置：miniprogram/app.js
    > 
    > 请替换为自己的云环境ID

  - appid
    > 位置：project.config.json
    > 
    > 请替换为自己的appid

#### 参数详解

  - 单位：统一使用 `rpx`

  - minHeight
    > - 从中心图片顶部到版权信息顶部的距离
    >
    > - 用于动态地设置版权信息的位置，以适配长图的显示

  - height
    > - 底部按钮的高度
    >
    > - 用于适配部分机型的底部样式

  - bottom
    > - 版权信息到底部的距离
    >
    > - 用于适配 `height` 参数,防止被底部按钮覆盖

  - lockHeight
    
    > - 记录初始的 `height`
