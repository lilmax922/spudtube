<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-20 text-center">
    <h1 class="text-2xl font-bold tracking-tight">
      {{ t('detail.notFound.title') }}
    </h1>
    <p class="max-w-prose text-muted-foreground">
      {{ t('detail.notFound.body') }}
    </p>
    <NuxtLink
      to="/"
      class="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
    >
      {{ t('detail.notFound.backHome') }}
    </NuxtLink>
  </div>
</template>
