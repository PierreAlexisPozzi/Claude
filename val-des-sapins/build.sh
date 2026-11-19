#!/bin/sh
# Builds the standalone page (index.html) from the artifact source (game.html).
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="fr">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'; cat game.html; } > index.html
