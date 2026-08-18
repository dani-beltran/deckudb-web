<template>
  <AdminDashboard />
</template>

<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import AdminDashboard from '../../views/AdminDashboard.vue'

definePageMeta({ layout: 'admin', name: 'AdminDashboard' })
useHead({
  title: 'Admin Dashboard - DeckuDB',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>
