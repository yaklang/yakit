#!/usr/bin/env node
import('./release/create-tag.mjs').then(({ main }) => main('memfit'))
