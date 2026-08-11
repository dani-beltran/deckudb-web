<template>
  <Home />
</template>

<script setup lang="ts">
import Home from '../views/Home.vue'
import { definePageMeta } from '#imports'

definePageMeta({ name: 'Home' })
</script>
