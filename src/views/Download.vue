<template>
  <div :class="['container fr', !taskList || !taskList.length ? 'ac jc' : 'bg-fff']">
    <div class="back-icon">
      <a-icon type="rollback" class="icon" @click="goHome" />
    </div>
    <a-empty v-if="!taskList || !taskList.length" class="text-active">
      <span slot="description" class="text-active" style="font-weight: bold">暂无数据</span>
    </a-empty>
    <template v-else>
      <div class="left">
        <div class="fr jsb aic" style="height: 30px;border-bottom: 1px solid #eeeeee;">
          <span style="color: #999">共 {{taskList.length}} 个</span>
          <span @click="clearTaskList" style="color: #333;margin-right: 10px; cursor: pointer;">清空全部&nbsp;<a-icon type="delete"></a-icon></span>
        </div>
        <div class="task-content">
          <div v-for="(item, index) in taskList" :key="index">
            <a-dropdown :trigger="['contextmenu']">
              <div @dblclick="onDoubleClick(item)" :class="['fr', 'download-item', selected === index ? 'active' : '']" @click="switchItem(index)">
              <div class="img fr ac">
                <img :src="item.cover | formatCover" :alt="item.title">
              </div>
              <div class="content fc jsb">
                <div class="ellipsis-1">{{ item.title }}</div>
                <div>状态：<span class="text-active">{{ item.status | formatProgress }}</span></div>
                <div>
                  <a-progress :percent="item.progress" :status="item.status | formatStatus" strokeColor="#fb7299"></a-progress>
                </div>
              </div>
              </div>
              <a-menu slot="overlay" @click="onOperationClick(item, $event)">
                <a-menu-item key="play">
                  播放
                </a-menu-item>
                <a-menu-item key="open">
                  打开文件夹
                </a-menu-item>
                <a-menu-item key="remove">
                  从列表中移除
                </a-menu-item>
                <a-menu-item key="delete">
                  移除并删除本地
                </a-menu-item>
              </a-menu>
            </a-dropdown>
          </div>
        </div>
      </div>
      <div class="right" style="padding-top: 29px">
        <div class="image">
          <img :src="current.cover | formatCover" :alt="current.title">
        </div>
        <div class="pl16 mt8 text-active" @click="openExternal(current.url)">{{ current.title }}</div>
        <div v-if="current.up && current.up[0] && current.up[0].name" class="fr ac pl16 mt8 warp">
          UP：<div v-for="(item, index) in current.up" :key="index" class="mr16">
            <a @click="openExternal(`https://space.bilibili.com/${item.mid}`)">{{ item.name }}</a>
          </div>
        </div>
        <div class="mt8 pl16">创建时间：<span class="text-active">{{ current.createdTime }}</span></div>
        <div class="mt8 pl16">视频大小：<span class="text-active">{{ current.size ? current.size : '' }}</span></div>
        <div class="mt8 pl16">视频时长：<span class="text-active">{{ current.duration }}</span></div>
        <div class="mt8 pl16">清晰度：<span class="text-active">{{ current.quality | formatQuality }}</span></div>
        <div class="mt8 pl16">播放：<span class="text-active">{{ current.watch }}</span></div>
        <div class="mt8 pl16">弹幕：<span class="text-active">{{ current.danmu }}</span></div>
        <div class="mt8 pl16">评论：<span class="text-active">{{ current.comment }}</span></div>
        <!-- <div class="operate fr ac jc">
          <a-button icon="delete" type="primary" @click="delDir(current)">删除</a-button>
          <a-button class="ml16" icon="folder" type="primary" @click="openFolder(current)">打开</a-button>
        </div> -->
      </div>
    </template>
  </div>
</template>

<script>
import quality from '../assets/data/quality'
const fs = require('fs')
export default {
  data () {
    return {
      taskList: [],
      selected: null,
      current: null
    }
  },
  components: {},
  computed: {},
  watch: {},
  filters: {
    formatStatus (status) {
      const mapData = {
        1: 'active',
        2: 'active',
        3: 'active',
        4: 'active',
        0: 'success',
        '-1': 'exception'
      }
      return mapData[status]
    },
    formatProgress (status) {
      const mapData = {
        1: '视频下载中',
        2: '音频下载中',
        3: '音频转换中(可能会略久一些...)',
        4: '视频合成中',
        0: '已完成',
        '-1': '下载失败'
      }
      return `${mapData[status]}`
    },
    formatQuality (id) {
      return quality[id]
    },
    formatCover (img) {
      return `http://127.0.0.1:8964/?img=${img}`
    }
  },
  mounted () {
    this.getTaskList()
    window.ipcRenderer.on('reply-download-video', this.handleProgress)
  },
  created () {},
  destroyed () {
    window.ipcRenderer.removeListener('reply-download-video', this.handleProgress)
  },
  methods: {
    openFolder (videoInfo) {
      const setting = window.remote.getGlobal('store').get('setting')
      let dir = ''
      if (process.platform === 'win32') {
        dir = `${setting.downloadPath}\\${videoInfo.dirTitle}`
      } else {
        dir = `${setting.downloadPath}/${videoInfo.dirTitle}/`
      }
      if (!fs.existsSync(dir)) {
        this.$message.error('文件夹已被删除')
        return
      }
      window.remote.shell.showItemInFolder(dir)
    },
    delDir (videoInfo, deleteType) {
      // 删除文件
      if (deleteType === 'delete') {
        const setting = window.remote.getGlobal('store').get('setting')
        fs.rmdir(`${setting.downloadPath}/${videoInfo.dirTitle}`, { recursive: true }, err => {
          if (err) {
            console.log(err)
          } else {
            console.log('video-删除成功')
          }
        })
      }
      // 删除记录
      const taskList = window.remote.getGlobal('store').get('taskList')
      const index = taskList.findIndex(item => item.id === videoInfo.id)
      taskList.splice(index, 1)
      window.remote.getGlobal('store').set('taskList', taskList)
      this.$message.success(`${deleteType === 'delete' ? '删除' : '从列表移除'}成功`)
      this.getTaskList()
    },
    getVideoSize (videoInfo) {
      const setting = window.remote.getGlobal('store').get('setting')
      fs.stat(`${setting.downloadPath}/${videoInfo.dirTitle}/${videoInfo.title}.mp4`, (err, info) => {
        if (err) {
          console.log(err)
        } else {
          const taskList = window.remote.getGlobal('store').get('taskList')
          const index = taskList.findIndex(item => item.id === videoInfo.id)
          taskList[index].size = `${(info.size / 1000 / 1000).toFixed(2)}MB`
          window.remote.getGlobal('store').set('taskList', taskList)
          this.getTaskList()
        }
      })
    },
    handleProgress (event, videoInfo) {
      // console.log(JSON.stringify(videoInfo))
      const index = this.taskList.findIndex(item => item.id === videoInfo.id)
      if (index !== -1) {
        this.$set(this.taskList, index, {
          ...this.taskList[index],
          status: videoInfo.status,
          progress: videoInfo.progress
        })
        // 成功/失败 后更新数据
        if (videoInfo.status === 0 || videoInfo.status === -1) {
          const taskList = window.remote.getGlobal('store').get('taskList')
          const index = taskList.findIndex(item => item.id === videoInfo.id)
          taskList[index].status = videoInfo.status
          taskList[index].progress = videoInfo.progress
          window.remote.getGlobal('store').set('taskList', taskList)
        }
        if (videoInfo.status === 0) {
          this.getVideoSize({
            ...this.taskList[index],
            status: videoInfo.status,
            progress: videoInfo.progress
          })
        }
      }
    },
    openExternal (url) {
      if (url) {
        window.ipcRenderer.send('open-external', url)
      }
    },
    getTaskList () {
      this.taskList = window.remote.getGlobal('store').get('taskList') ? window.remote.getGlobal('store').get('taskList').reverse() : []
      if (this.taskList && this.taskList.length) {
        this.switchItem(0)
      }
    },
    clearTaskList () {
      this.$confirm({
        title: '确定要清空全部记录吗？',
        content: '视频文件不会被删除',
        cancelText: '取消',
        okText: '清空',
        onOk: () => {
          this.taskList = []
          window.remote.getGlobal('store').set('taskList', [])
        }
      })
    },
    goHome () {
      this.$router.push('/')
    },
    switchItem (index) {
      this.selected = index
      this.current = this.taskList[index]
    },
    onDoubleClick (videoInfo) {
      this.playFile(videoInfo)
    },
    playFile (videoInfo) {
      const setting = window.remote.getGlobal('store').get('setting')
      const playIfExist = (extension) => {
        const filePath = `${setting.downloadPath}/${videoInfo.dirTitle}/${videoInfo.title}${extension}`
        const fileEs = fs.existsSync(filePath)
        if (fileEs) {
          // 打开
          window.remote.shell.openPath(filePath)
          return true
        }
        return false
      }
      return playIfExist('.mp4') || playIfExist('.mp3') || playIfExist('.wav') || playIfExist('.m4a')
    },
    onOperationClick (item, { key }) {
      switch (key) {
        case 'open':
          this.openFolder(item)
          break
        case 'remove':
        case 'delete':
          this.delDir(item, key)
          break
        case 'play':
          this.playFile(item)
          break
      }
    }
  }
}
</script>

<style scoped lang="less">
.container{
  box-sizing: border-box;
  padding: 15px 16px 16px;
  position: relative;
  height: calc(100vh - 28px);
  &.bg-fff{
    background: #ffffff;
  }
  .back-icon{
    position: absolute;
    top: 10px;
    right: 16px;
    z-index: 99;
    cursor: pointer;
    .icon{
      font-size: 36px;
      color: @primary-color;
    }
  }
  .left{
    flex: 5;
    .task-content {
      border-right: 1px solid #eeeeee;
      overflow-y: scroll;
      &::-webkit-scrollbar{
        display: none;
      }
    }
    .download-item{
      border-bottom: 1px solid #eeeeee;
      cursor: pointer;
      &.active{
        background: rgba(251, 114, 153, 0.2);
      }
      .img{
        flex: none;
        width: 106px;
        height: 79px;
        overflow: hidden;
        position: relative;
        img{
          display: block;
          width: 100%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      }
      .content{
        box-sizing: border-box;
        flex: none;
        width: 364px;
        padding: 8px;
        position: relative;
      }
    }
  }
  .right{
    position: relative;
    flex: 3;
    .image{
      height: 179px;
      overflow: hidden;
      position: relative;
      img{
        display: block;
        width: 100%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }
    .operate{
      position: absolute;
      width: 100%;
      bottom: 0px;
      left: 0px;
    }
  }
}
/deep/.ant-progress-status-success .ant-progress-text{
  color: @primary-color;
}
</style>
