<template>
  <div class="container">
    <div class="download-icon">
      <a-badge :color="isDot ? '#fb7299' : ''">
        <a-icon type="download" class="icon" @click="goDownload" />
      </a-badge>
    </div>
    <div class="download-logo fr ac jc">
      <img src="../assets/images/logo.png" alt="">
    </div>
    <div class="download-box">
      <a-input v-model="url" @keyup.enter="download" allow-clear size="large" placeholder="请输入视频地址或BV号">
        <a-tooltip slot="addonBefore" placement="bottom">
          <a-dropdown :trigger="['click']">
            <a-icon type="history" class="icon">
            </a-icon>
            <a-menu style="max-height: 250px;overflow: auto" v-if="searchHistoryList.length > 0" slot="overlay">
              <a-menu-item @click="onClickSearchItem(item)" :key="item" v-for="item in searchHistoryList">
                <div class="fr jsb aic">
                  <span class="ellipsis-1 flex: 1">{{item}}</span>
                  <a-icon type="close" style="margin: 0 5px 0 20px;color:#ff0000" @click="saveSearchHistory(item, true, $event)"/>
                </div>
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="clear" @click="clearSeachHistory">
                <div class="fr jc aic">清空<a-icon type="delete" style="margin-left: 5px;" /></div>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
          <template v-if="searchHistoryList.length === 0" slot="title">
            暂无搜索记录
          </template>
        </a-tooltip>
        <a-icon slot="addonAfter" type="search" class="icon" @click="download" />
      </a-input>
    </div>
    <VideoModal ref="videoModal"></VideoModal>
  </div>
</template>

<script>
import { checkUrl, parseHtml } from '../utlis/bilibili'
import UA from '../assets/data/ua'
import VideoModal from '../components/VideoModal'
export default {
  name: 'home',
  data () {
    return {
      url: '',
      got: null,
      isDot: false,
      searchHistoryList: []
    }
  },
  components: {
    VideoModal
  },
  computed: {},
  watch: {},
  mounted () {},
  created () {
    this.got = window.remote.getGlobal('got')
    this.searchHistoryList = this.getSearchHistory()
  },
  methods: {
    goDownload () {
      this.$router.push('/download')
    },
    async download () {
      const SESSDATA = window.remote.getGlobal('store').get('setting.SESSDATA')
      // if (!SESSDATA) {
      //   this.$message.info('请设置SESSDATA')
      //   return
      // }
      if (!this.url) {
        this.$message.error('请输入视频地址')
        return
      }
      // BV/AV号支持
      let targetUrl = this.url
      if (this.url.match(/(^av[0-9]+)|^bv1\w+/ig)) {
        targetUrl = 'https://www.bilibili.com/video/' + this.url
      }
      const params = {
        url: targetUrl,
        config: {
          headers: {
            'User-Agent': `${UA}`,
            cookie: `SESSDATA=${SESSDATA || ''}`
          }
        }
      }
      try {
        const res = await this.got(params.url, params.config)
        // 检测是否有重定向
        const url = res.redirectUrls[0] ? res.redirectUrls[0] : targetUrl
        const type = checkUrl(url)
        if (type === -1) {
          this.$message.error('请输入正确的视频地址')
          return
        }
        this.saveSearchHistory(this.url)
        const videoInfo = await parseHtml(res.body, type, url)
        this.$refs.videoModal.show(videoInfo)
      } catch (error) {
        console.log(error)
        if (error === -1) {
          this.$message.info('不支持当前视频')
        }
      }
    },
    onClickSearchItem (item) {
      this.url = item
    },
    getSearchHistory () {
      return window.remote.getGlobal('store').get('SearchList') || []
    },
    saveSearchHistory (item, isDelete = false, event) {
      const searchList = this.getSearchHistory()
      const indexOfItem = searchList.indexOf(item)
      if (indexOfItem !== -1) {
        searchList.splice(indexOfItem, 1)
      }
      if (!isDelete) {
        searchList.unshift(item)
      }
      this.searchHistoryList = searchList
      window.remote.getGlobal('store').set('SearchList', searchList)
      event && event.stopPropagation()
    },
    clearSeachHistory () {
      this.searchHistoryList = []
      window.remote.getGlobal('store').set('SearchList', [])
    }
  }
}
</script>

<style scoped lang="less">
.container{
  box-sizing: border-box;
  padding: 16px;
  position: relative;
  .download-icon{
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
  .download-logo{
    margin: 130px 0px 50px 0px;
    img{
      transform: scale(.6);
    }
  }
  .download-box{
    padding: 0px 64px;
    /deep/ .ant-input-group-addon{
      background: @primary-color;
      border: none;
    }
    .icon{
      color: #ffffff;
      font-size: 18px;
    }
  }
}
</style>
