<template>
  <SearchResults />
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'
import SearchResults from '../views/SearchResults.vue'

definePageMeta({ name: 'SearchResults' })
</script>
