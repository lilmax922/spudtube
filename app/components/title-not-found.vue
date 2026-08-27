<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-4 px-6 py-20 text-center">
    <h1 class="text-2xl font-extrabold tracking-[-0.02em] text-foreground">
      {{ t('detail.notFound.title') }}
    </h1>
    <p class="max-w-prose text-sm font-normal leading-[1.7] text-muted-foreground">
      {{ t('detail.notFound.body') }}
    </p>
    <NuxtLink
      to="/"
      class="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
    >
      {{ t('detail.notFound.backHome') }}
    </NuxtLink>
  </div>
</template>
