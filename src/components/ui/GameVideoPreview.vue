<template>
    <div class="game-image-container" v-if="game && game.steam_app?.header_image">
        <a :href="steamStoreUrl" target="_blank" rel="noopener noreferrer" class="steam-link" @mouseenter="onMouseEnter"
            @mouseleave="onMouseLeave">
            <img v-show="!showTrailer" :src="game.steam_app.header_image" :alt="`${game.steam_app.name} cover image`" class="game-image"/>
            <video v-show="showTrailer" ref="videoElement" class="game-trailer" autoplay muted loop
                playsinline></video>
        </a>
    </div>
</template>

<script>
import Hls from 'hls.js'

export default {
  name: 'GameVideoPreview',
  props: {
    // Steam Game Details from Steam API appdetails
    game: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showTrailer: false,
      hlsInstance: null,
    }
  },
  computed: {
    steamStoreUrl() {
      return this.game?.steam_app
        ? `https://store.steampowered.com/app/${this.game.steam_app.steam_appid}/`
        : '#'
    },
  },
  async mounted() {
    await this.setupVideoSource()
  },
  beforeUnmount() {
    this.destroyHls()
  },
  methods: {
    async setupVideoSource() {
      const video = this.$refs.videoElement
      const videoData = await this.getValidVideoData()
      if (!video || !videoData) return

      const { url, type } = videoData

      // Clean up any existing HLS instance
      this.destroyHls()

      if (type === 'hls') {
        // HLS format - use hls.js or native support
        if (Hls.isSupported()) {
          this.hlsInstance = new Hls()
          this.hlsInstance.loadSource(url)
          this.hlsInstance.attachMedia(video)
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = url
        }
      } else {
        // Direct video formats (webm, mp4)
        video.src = url
      }
    },

    destroyHls() {
      if (this.hlsInstance) {
        this.hlsInstance.destroy()
        this.hlsInstance = null
      }
    },

    async getValidVideoData() {
      if (this.game?.steam_app?.movies) {
        // Find the first valid trailer URL
        for (const movie of this.game.steam_app.movies) {
          // Try direct video formats first (webm, mp4)
          const directUrl = movie?.webm?.max || movie?.mp4?.max
          if (directUrl) {
            try {
              const response = await fetch(directUrl, { method: 'HEAD' })
              if (response.status === 200) {
                return { url: directUrl, type: 'direct' }
              }
            } catch {
              // Continue to next format if fetch fails
            }
          }

          // Try HLS format (hls_h264) - widely supported
          if (movie?.hls_h264) {
            try {
              const response = await fetch(movie.hls_h264, { method: 'HEAD' })
              if (response.status === 200) {
                return { url: movie.hls_h264, type: 'hls' }
              }
            } catch {
              // Continue to next format if fetch fails
            }
          }
        }
      }
      return null
    },

    onMouseEnter() {
      const video = this.$refs.videoElement
      if (!video || (!video.src && !this.hlsInstance)) return

      this.showTrailer = true
      // Resume video playback when mouse enters
      this.$nextTick(() => {
        video?.play().catch((error) => {
          console.error('Error playing video:', error)
          this.showTrailer = false
        })
      })
    },

    onMouseLeave() {
      // Pause video before hiding
      this.$refs.videoElement?.pause()
      this.showTrailer = false
    },
  },
}
</script>

<style scoped>
.game-image-container {
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    position: relative;
}

.game-image {
    width: 460px;
    height: 215px;
    object-fit: cover;
    display: block;
    transition: transform 0.2s ease;
}

.game-image:hover {
    transform: scale(1.02);
}

.game-trailer {
    width: 460px;
    height: 215px;
    display: block;
    background: #000;
}

.steam-link {
    display: block;
    text-decoration: none;
}

@media (max-width: 768px) {

    .game-image,
    .game-trailer {
        width: 100%;
        max-width: 280px;
        height: auto;
        aspect-ratio: 280/130;
    }
}

@media (max-width: 480px) {

    .game-image,
    .game-trailer {
        width: 100%;
        max-width: 100%;
    }
}
</style>
