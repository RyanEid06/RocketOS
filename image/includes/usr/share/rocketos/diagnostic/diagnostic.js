/**
 * RocketOS Phase 3 — Technical Diagnostic UI Controller
 */
(function() {
  'use strict';

  const logBox = document.getElementById('log-box');

  function appendLog(type, message) {
    if (!logBox) return;
    const now = new Date().toISOString().substring(11, 19);
    const div = document.createElement('div');
    div.className = 'log-entry';

    let colorClass = 'log-info';
    if (type === 'success') colorClass = 'log-success';
    if (type === 'error') colorClass = 'log-error';

    div.innerHTML = `<span class="log-time">[${now}]</span> <span class="${colorClass}">[${type.toUpperCase()}]</span> <span>${message}</span>`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function setEl(id, val, isHighlight = false) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = val;
      if (isHighlight) el.classList.add('highlight');
    }
  }

  async function runPing() {
    appendLog('info', 'Executing native bridge ping...');
    const t0 = performance.now();
    try {
      const res = await window.rocketBridge.ping();
      const rtt = (performance.now() - t0).toFixed(2);
      appendLog('success', `Ping response received (RTT: ${rtt}ms, pong: ${res.pong})`);
      setEl('bridge-latency', `${rtt} ms`);
    } catch (err) {
      appendLog('error', `Ping failed: ${err.message}`);
    }
  }

  async function querySystem() {
    appendLog('info', 'Querying system telemetry via native bridge...');
    try {
      const info = await window.rocketBridge.getSystemInfo();
      setEl('val-system-name', info.systemName);
      setEl('val-pretty-name', info.prettyName);
      setEl('val-version-id', info.versionId);
      setEl('val-session-type', info.sessionType, true);
      setEl('val-compositor', info.compositor, true);
      setEl('val-host-runtime', info.hostRuntime);
      setEl('val-session-user', info.sessionUser, true);
      setEl('val-hostname', info.hostname);
      setEl('val-init-system', info.initSystem);
      setEl('val-arch', info.arch);
      setEl('val-kernel', info.kernelUname);
      appendLog('success', `System telemetry updated: ${info.prettyName} (${info.arch})`);
    } catch (err) {
      appendLog('error', `System query failed: ${err.message}`);
    }
  }

  async function queryBridgeVersion() {
    try {
      const ver = await window.rocketBridge.getBridgeVersion();
      setEl('val-protocol-ver', ver.protocolVersion);
      setEl('val-webkit-ver', ver.webkitVersion);
      setEl('val-gtk-ver', ver.gtkVersion);
      appendLog('info', `Bridge protocol v${ver.protocolVersion} on WebKitGTK ${ver.webkitVersion}`);
    } catch (err) {
      appendLog('error', `Bridge version query failed: ${err.message}`);
    }
  }

  window.addEventListener('DOMContentLoaded', async () => {
    appendLog('info', 'RocketOS Phase 3 Diagnostic UI initialized');
    setEl('val-bridge-status', window.rocketBridge.hasNativeHost() ? 'NATIVE (WebKitGTK 6.0)' : 'SIMULATED (Web Preview)', true);

    document.getElementById('btn-ping')?.addEventListener('click', runPing);
    document.getElementById('btn-version')?.addEventListener('click', queryBridgeVersion);
    document.getElementById('btn-system')?.addEventListener('click', querySystem);

    // Initial automated handshake
    await runPing();
    await queryBridgeVersion();
    await querySystem();
  });
})();
