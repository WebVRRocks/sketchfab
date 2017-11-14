(function () {
  window.addEventListener('gamepad.buttonvaluechange', function (e) {
    console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
  });

  window.addEventListener('gamepad.buttondown', function (e) {
    console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
  });

  window.addEventListener('gamepad.buttonup', function (e) {
    console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
  });

  window.addEventListener('gamepad.buttondown.oculusremote.b0', function (e) {
    console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
  });
})();
