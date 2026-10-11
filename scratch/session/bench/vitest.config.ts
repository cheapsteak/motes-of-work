

export default ({
  root: '/home/user/motes-of-work',
  server: { fs: { allow: ['/home/user/motes-of-work', '/tmp/claude-0'] } },
  test: {
    include: ['<scratchpad>/bench/*.test.ts'],
    dir: '<scratchpad>/bench',
    environment: 'node',
  },
});
