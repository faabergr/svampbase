import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMcpTools, errMsg } from './mcpTools';

const server = new McpServer({ name: 'svampbase', version: '0.1.0' });
registerMcpTools(server);

const transport = new StdioServerTransport();
server.connect(transport).catch((err: unknown) => {
  process.stderr.write(`MCP server error: ${errMsg(err)}\n`);
  process.exit(1);
});
