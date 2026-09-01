<script setup lang="ts">
defineProps<{
  title: string
  description?: string | null
  year?: string | null
}>()
</script>

<template>
  <div
    style="width: 1200px; height: 630px; display: flex; flex-direction: column; justify-content: space-between; padding: 56px; background: oklch(0.105 0.012 275); color: oklch(0.96 0.008 280); --background: oklch(0.105 0.012 275); --foreground: oklch(0.96 0.008 280);"
  >
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div
        style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em; opacity: 0.95; color: oklch(0.96 0.008 280);"
      >
        SpudTube
      </div>
      <div
        style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; margin-top: 16px;"
      >
        <h1
          style="font-size: 64px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; color: oklch(0.96 0.008 280); max-width: 100%;"
        >
          {{ title }}
        </h1>
        <span
          v-if="year"
          style="font-size: 36px; font-weight: 500; opacity: 0.72; color: oklch(0.96 0.008 280);"
        >({{ year }})</span>
      </div>
    </div>
    <p
      v-if="description"
      style="font-size: 22px; line-height: 1.5; opacity: 0.78; color: oklch(0.96 0.008 280); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 1088px; margin-top: 24px;"
    >
      {{ description }}
    </p>
    <div
      v-else
      style="height: 24px;"
    />
  </div>
</template>
