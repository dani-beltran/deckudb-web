<template>
  <GamePage :game-id="String(route.params.gameId)" />
</template>

<script setup lang="ts">
import { definePageMeta, useRoute } from '#imports'
import GamePage from '../../views/GamePage.vue'

definePageMeta({ name: 'Game' })
const route = useRoute()
</script>
