module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'no-restricted-syntax': ['error',
      { selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]", message: 'Use semantic theme tokens instead of hex colours.' },
      { selector: "Literal[value=/^(bg|text|border|from|to|via)-(red|blue|green|yellow|gray|slate|indigo|purple|pink|orange)-[0-9]+$/]", message: 'Use semantic theme classes instead of Tailwind palette classes.' }
    ]
  }
};
