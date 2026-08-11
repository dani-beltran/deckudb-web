<template>
  <SearchResults />
</template>

<script setup lang="ts">
import SearchResults from '../views/SearchResults.vue'
import { definePageMeta } from '#imports'

definePageMeta({ name: 'SearchResults' })
</script>
