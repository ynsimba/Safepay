# Déploiement SafePay (VPS)

Production : `https://pay.safecheckrdc.com` sur `191.215.38.33`.

## Secret GitHub `VPS_SSH_KEY`

Le workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) se connecte en `safecheck@191.215.38.33`.

Dans le dépôt [ynsimba/Safepay](https://github.com/ynsimba/Safepay) :

1. Settings → Secrets and variables → Actions
2. New repository secret
3. Nom : `VPS_SSH_KEY`
4. Valeur : la **clé privée** SSH du user `safecheck` (même secret que Safecheck-med)

Sans ce secret, le CI passe mais le job Deploy échoue.

## Mise à jour manuelle

```bash
sudo -u safecheck bash /var/www/safepay/deploy/update.sh
```
