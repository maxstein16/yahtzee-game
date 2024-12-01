/**
 * Placeholder function for broadcasting messages to WebSocket clients.
 * @param {Object} message - The message to broadcast.
 */
function broadcastMessage(data) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }  

module.exports = broadcastMessage;
  