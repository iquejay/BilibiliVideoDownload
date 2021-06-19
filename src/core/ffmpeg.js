const ffmpeg = require('@ffmpeg-installer/ffmpeg')
const { exec } = require('child_process')
const isDevelopment = process.env.NODE_ENV !== 'production'
let ffmpegPath = ffmpeg.path
if (!isDevelopment) {
  // see: https://github.com/electron/electron-packager/issues/740
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
}

export default class FFmpeg {
  constructor (params) {
    this.ffmpeg = null
    this.videoPath = params.videoPath
    this.audioPath = params.audioPath
    this.mergePath = params.mergePath
    this.outAudioPath = params.outAudioPath
  }

  kill () {
    if (this.ffmpeg) {
      this.ffmpeg.kill()
    }
  }

  execFfmpeg (cmd, callback) {
    return exec(`"${ffmpegPath}" -y ${cmd}`, callback)
  }

  startMerge (fun) {
    fun('start')
    this.ffmpeg = this.execFfmpeg(`-i "${this.videoPath}" -i "${this.audioPath}" -codec copy "${this.mergePath}"`, (error) => {
      if (error) {
        console.log('an error happened: ' + error)
        fun('error')
      } else {
        console.log('file has been converted succesfully')
        fun('end')
      }
    })
  }

  transAudio (fun) {
    return new Promise((resolve, reject) => {
      fun('start')
      this.ffmpeg = this.execFfmpeg(`-i "${this.audioPath}" ${this.outAudioPath}`, error => {
        if (error) {
          console.log('an error happened: ' + error)
          fun('error')
          reject(error)
        } else {
          console.log('file has been converted succesfully')
          fun('end')
          resolve('success')
        }
      })
    })
  }
}
