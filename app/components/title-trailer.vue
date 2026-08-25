<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  trailerKey: string | null
}
defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <section
    v-if="trailerKey"
    class="rounded-lg bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-[12px]"
  >
    <h2 class="mb-3 flex items-center gap-2 text-[16.5px] font-bold tracking-tight text-foreground">
      {{ t('detail.trailer') }}
    </h2>
    <div class="aspect-video w-full overflow-hidden rounded-md bg-black">
      <iframe
        :src="`https://www.youtube-nocookie.com/embed/${trailerKey}`"
        class="h-full w-full"
        :title="t('detail.trailer')"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>
  </section>
</template>
