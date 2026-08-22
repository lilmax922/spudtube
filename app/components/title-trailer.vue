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
    class="rounded-lg border border-border bg-card/80 p-5 backdrop-blur-lg backdrop-saturate-150"
  >
    <h2 class="mb-3 flex items-center gap-2 text-[16.5px] font-bold tracking-tight text-foreground">
      {{ t('detail.trailer') }}
    </h2>
    <div class="aspect-video w-full overflow-hidden rounded-md border border-border bg-black">
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
