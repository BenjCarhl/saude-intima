# Notificações no app Saúde Íntima

Este documento descreve como ativar e receber notificações no app, tanto no fluxo local atual quanto no fluxo push via servidor.

## 1. Como as notificações funcionam hoje

O app já inclui:

- `sw.js` — service worker que registra o app offline e mostra notificações.
- `pwa-additions.js` — registra o service worker, pede permissão de notificações e exibe notificações via `ServiceWorkerRegistration.showNotification()`.
- `localStorage` — guarda ciclos e notificações planejadas.

O fluxo atual é principalmente local: o navegador exibe notificações quando o app está aberto ou quando o service worker está ativo.

## 2. Passos para receber notificações no navegador

1. Abra o app em `https://` ou em `http://localhost`.
2. Verifique se o navegador suporta service worker e notificações.
3. O service worker é registrado automaticamente em `pwa-additions.js`:
   - `navigator.serviceWorker.register('sw.js')`
4. No app, clique no botão de ativar notificações do Diário do Ciclo.
5. Aceite a permissão de notificações quando o navegador pedir.
6. Preencha e salve os dados do ciclo no formulário de ciclo menstrual.
7. O app agenda lembretes locais usando `setTimeout` e notificações estão previstas para:
   - próxima menstruação
   - ovulação prevista
   - janela fértil

### Observações

- As notificações locais dependem do navegador carregar o app e do service worker estar registrado.
- Se o navegador for fechado ou a guia ficar inativa, o funcionamento de lembretes com `setTimeout` fica limitado.
- O service worker também guarda notificações planejadas em `localStorage` e reagenda ao recarregar a página.

## 3. Testando notificações agora

- Use o botão `cycle-test-notification` para disparar uma notificação de teste.
- Use o botão de ativar notificações para conceder permissão e habilitar a agenda do ciclo.

## 4. Como receber notificações push do servidor

O app já tem suporte básico no service worker para receber push no evento `push` em `sw.js`.

### 4.1 Requisitos

- A aplicação deve rodar em `https://` ou `http://localhost`.
- O browser deve suportar Push API e Notification API.
- É necessário implementar o fluxo de inscrição (subscription) no cliente.
- O servidor deve enviar as mensagens push usando o endpoint retornado pela inscrição.

### 4.2 Fluxo de implementação do lado do cliente
O app já inclui um botão de inscrição de notificações push no painel do Diário do Ciclo. Para funcionar, você deve:

- definir a chave pública VAPID no código do cliente (`PUSH_PUBLIC_KEY`);
- garantir que o service worker esteja registrado;
- inscrever o dispositivo usando `pushManager.subscribe()`;
- enviar a assinatura ao servidor.
1. Registrar `sw.js` (já feito).
2. Pedir permissão de notificações com `Notification.requestPermission()`.
3. Obter `ServiceWorkerRegistration` via `navigator.serviceWorker.ready`.
4. Chamar `registration.pushManager.subscribe()` com as chaves VAPID do servidor.
5. Enviar o objeto de subscription para o servidor via `fetch()`.

Exemplo de código adicional no cliente:

```js
const reg = await navigator.serviceWorker.ready;
const subscription = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array('<SUA_CHAVE_VAPID_PÚBLICA>')
});
await fetch('/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(subscription)
});
```

### 4.3 Fluxo do lado do servidor

1. Gerar chaves VAPID.
2. Receber e armazenar a subscription enviada pelo cliente.
3. Enviar notificações usando a biblioteca Web Push.

Exemplo com Node.js/`web-push`:

```js
const webpush = require('web-push');
webpush.setVapidDetails(
  'mailto:seu-email@dominio.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const payload = JSON.stringify({
  title: 'Lembrete do Diário do Ciclo',
  body: 'Está na hora de registar o seu estado no diário.',
  tag: 'cycle-reminder'
});

webpush.sendNotification(subscription, payload)
  .then(() => console.log('Push enviada'))
  .catch(err => console.error('Erro ao enviar push', err));
```

### 4.4 Formato do payload

No `sw.js`, o evento `push` espera um JSON com essas propriedades:

```json
{
  "title": "...",
  "body": "...",
  "tag": "..."
}
```

O service worker mostra a notificação assim:

```js
self.registration.showNotification(data.title, {
  body: data.body,
  tag: data.tag || 'saude-push',
  data: data
});
```

### 4.5 Abrir a app ao clicar na notificação

O `notificationclick` em `sw.js` já abre ou foca a URL `/#calendario`.

## 5. Considerações finais

- Para notificações locais automáticas do Diário do Ciclo, é suficiente ativar as notificações e salvar um ciclo.
- Para notificações push reais via servidor, é preciso implementar a inscrição com `PushManager.subscribe()` e um endpoint de servidor que envie mensagens.
- O servidor deve usar HTTPS e chaves VAPID.

## 6. Próximos passos sugeridos

- adicionar um botão de "habilitar notificações push" que grava a assinatura no servidor;
- estender `pwa-additions.js` para assinar `pushManager` e enviar a subscrição;
- criar um serviço backend para enviar lembretes push para usuários com ciclos salvos.
