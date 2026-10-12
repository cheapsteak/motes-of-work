

export default ({
  root: '.',
  server: { fs: { allow: ['.', '<scratchpad>'] } },
  test: {
    include: ['<scratchpad>/bench/*.test.ts'],
    dir: '<scratchpad>/bench',
    environment: 'node',
  },
});
