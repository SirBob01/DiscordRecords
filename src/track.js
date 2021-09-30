const voice = require('@discordjs/voice')
const ytdl = require('youtube-dl-exec')
const ytdlCore = require('ytdl-core')
const ytsearch = require('youtube-search-api')

/**
 * Enum flags that describe the source of a track
 */
const sources = {
  YOUTUBE: 0,
  SPOTIFY: 1
}

/**
 * Generic class that represents a single track in the queue
 */
class Track {
  constructor (url, title, duration, source) {
    this.url = url
    this.title = title
    this.duration = duration
    this.source = source
  }

  getResource () {
    if (this.source == sources.YOUTUBE) {
      return new Promise((resolve, reject) => {
        const process = ytdl.raw(
          this.url,
          {
            o: '-',
            q: '',
            f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
            r: '100K'
          },
          { stdio: ['ignore', 'pipe', 'ignore'] }
        )
        const stream = process.stdout
        if (!stream) {
          reject(new Error('Failed to create a streamable resource.'))
        }
        process.once('spawn', async () => {
          const probe = await voice.demuxProbe(stream)
          const resource = voice.createAudioResource(probe.stream, {
            inputType: probe.type
          })
          resolve(resource)
        })
      })
    }
  }
}

exports.sources = sources

exports.fromYoutubeURL = async (url) => {
  const meta = await ytdlCore.getInfo(url)
  return new Track(
    meta.videoDetails.video_url,
    meta.videoDetails.title,
    meta.videoDetails.lengthSeconds,
    sources.YOUTUBE
  )
}

exports.fromSpotifyURL = async (url) => {
  throw new Error('TODO')
}

exports.fromYoutubeSearch = async (query) => {
  const results = await ytsearch.GetListByKeyword(query)
  if (results.items.length > 0) {
    const meta = await ytdlCore.getInfo(`https://www.youtube.com/watch?v=${results.items[0].id}`)
    return new Track(
      meta.videoDetails.video_url,
      meta.videoDetails.title,
      meta.videoDetails.lengthSeconds,
      sources.YOUTUBE
    )
  }
  return null
}
