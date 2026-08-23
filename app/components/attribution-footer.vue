<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-border bg-card/50">
    <div class="mx-auto max-w-6xl px-4 py-6">
      <p class="text-center text-[11px] leading-relaxed text-muted-foreground/80">
        {{ t('availability.attribution') }}
      </p>
    </div>
  </footer>
</template>
