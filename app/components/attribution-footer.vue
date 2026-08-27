<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-border bg-card">
    <div class="mx-auto max-w-[var(--max-content-width)] px-[var(--content-gutter)] py-6">
      <p class="text-center text-xs leading-relaxed text-muted-foreground/80">
        {{ t('availability.attribution') }}
      </p>
    </div>
  </footer>
</template>
