#!/bin/bash
echo "🧪 wordsmith-ts - Test Runner"
echo ""
echo "Running full test suite..."
npm test
echo ""
echo "Generating manual test outputs..."
node test-manual.js
echo ""
echo "✅ All tests completed!"
echo ""
echo "📁 Generated files in output/:"
ls -lh output/
