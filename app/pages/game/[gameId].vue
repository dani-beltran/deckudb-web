<template>
  <GamePage :game-id="String(route.params.gameId)" />
</template>

<script setup>
import GamePage from '../../views/GamePage.vue'

definePageMeta({ name: 'Game' })
const route = useRoute()
</script>
