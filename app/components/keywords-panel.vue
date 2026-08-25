<script setup lang="ts">
import { Tag } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

interface Props {
  keywords: string[]
}
defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <section
    class="border-t border-border py-6"
    :aria-label="t('detail.keywords.heading')"
  >
    <h2 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
      {{ t('detail.keywords.heading') }}
      <span class="text-[11px] font-medium normal-case tracking-normal text-muted-foreground">
        {{ t('detail.keywords.hint') }}
      </span>
    </h2>
    <div
      v-if="keywords.length > 0"
      class="flex flex-wrap gap-2"
    >
      <span
        v-for="keyword in keywords"
        :key="keyword"
        class="inline-flex h-8 items-center gap-1.5 rounded-full border border-input bg-muted px-3 text-[12.5px] font-medium text-muted-foreground"
      >
        <Tag :size="11" :stroke-width="1.75" aria-hidden="true" />
        {{ keyword }}
      </span>
    </div>
    <p
      v-else
      class="text-sm text-muted-foreground"
    >
      —
    </p>
  </section>
</template>
