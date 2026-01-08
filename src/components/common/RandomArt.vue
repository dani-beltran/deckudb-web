<template>
  <div class="random-art">
    <img :src="artImageUrl" :alt="`${selectedArt.caption_quote} - ${selectedArt.caption_author}`" class="art-image" />
  <div class="caption">
    <blockquote><cite>{{ selectedArt.caption_quote }}</cite></blockquote>
    <b>{{ selectedArt.caption_author }}</b>
  </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const artList = [
  {
    file: 'decku_jobs.jpg',
    caption_quote: '“Stay hungry. Stay foolish.”',
    caption_author: 'Steve Jobs',
  },
  {
    file: 'el_bufon_stanczyk.png',
    caption_quote: '“Become who you are.”',
    caption_author: 'Friedrich Nietzsche',
  },
  {
    file: 'el_grito.png',
    caption_quote: '“One who looks outside, dreams; one who looks inside, awakes.”',
    caption_author: 'Carl Jung',
  },
  {
    file: 'gabe.png',
    caption_quote: '“In Decku we trust.”',
    caption_author: 'Lord Gaben',
  },
  {
    file: 'houses.png',
    caption_quote: "“In the end, we only regret the chances we didn't take.”",
    caption_author: 'Lewis Carroll',
  },
  {
    file: 'saturn_goya.jpeg',
    caption_quote: '“Who controls the past controls the future. Who controls the present controls the past.”',
    caption_author: 'George Orwell',
  },
]

const randomIndex = Math.floor(Math.random() * artList.length)
const selectedArt = artList[randomIndex]

const artImageUrl = computed(() => `/art/${selectedArt.file}`)
</script>

<style scoped>
.random-art {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1.5rem 0;
}
.art-image {
  max-width: 100%;
  max-height: 580px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
}
.caption {
  max-width: 600px;
  font-size: 1.1rem;
  color: var(--text-primary);
  text-align: center;
}

@media screen and (max-width: 768px) {
  .art-image {
    max-height: 320px;
  }

  .caption {
    max-width: 300px;
    font-size: 0.9rem;
  } 
}
</style>
