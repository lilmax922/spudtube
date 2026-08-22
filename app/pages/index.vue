<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10">
    <h1 class="text-3xl font-bold tracking-tight">
      {{ t('home.title') }}
    </h1>
    <p class="mt-2 max-w-prose text-muted-foreground">
      {{ t('home.tagline') }}
    </p>
  </div>
</template>
