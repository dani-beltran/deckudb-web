<template>
  <NotFound />
</template>

<script setup lang="ts">
import NotFound from '../views/NotFound.vue'
import { definePageMeta } from '#imports'

definePageMeta({ name: 'NotFound' })
</script>
