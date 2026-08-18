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

<script setup lang="ts">
import Hls from 'hls.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { GameDetails } from './types'

defineOptions({ name: 'GameVideoPreview' })

const props = defineProps<{
  // Steam Game Details from Steam API appdetails
  game: GameDetails | null
}>()

type VideoData = {
  url: string
  type: 'direct' | 'hls'
}

const videoElement = ref<HTMLVideoElement | null>(null)
const showTrailer = ref(false)
const hlsInstance = shallowRef<Hls | null>(null)

const steamStoreUrl = computed(() =>
  props.game?.steam_app?.steam_appid
    ? `https://store.steampowered.com/app/${props.game.steam_app.steam_appid}/`
    : '#'
)

const destroyHls = (): void => {
  if (hlsInstance.value) {
    hlsInstance.value.destroy()
    hlsInstance.value = null
  }
}

const getValidVideoData = async (): Promise<VideoData | null> => {
  const movies = props.game?.steam_app?.movies
  if (!movies) return null

  // Find the first valid trailer URL
  for (const movie of movies) {
    // Try direct video formats first (webm, mp4)
    const directUrl = movie.webm?.max || movie.mp4?.max
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
    if (movie.hls_h264) {
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

  return null
}

const setupVideoSource = async (): Promise<void> => {
  const video = videoElement.value
  const videoData = await getValidVideoData()
  if (!video || !videoData) return

  const { url, type } = videoData

  // Clean up any existing HLS instance
  destroyHls()

  if (type === 'hls') {
    // HLS format - use hls.js or native support
    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsInstance.value = hls
      hls.loadSource(url)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url
    }
  } else {
    // Direct video formats (webm, mp4)
    video.src = url
  }
}

const onMouseEnter = (): void => {
  const video = videoElement.value
  if (!video || (!video.src && !hlsInstance.value)) return

  showTrailer.value = true
  // Resume video playback when mouse enters
  nextTick(() => {
    video.play().catch((error: unknown) => {
      console.error('Error playing video:', error)
      showTrailer.value = false
    })
  })
}

const onMouseLeave = (): void => {
  // Pause video before hiding
  videoElement.value?.pause()
  showTrailer.value = false
}

onMounted(setupVideoSource)
onBeforeUnmount(destroyHls)
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
