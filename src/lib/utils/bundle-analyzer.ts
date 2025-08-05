// Bundle analysis utilities for identifying optimization opportunities

export interface BundleAnalysis {
  unusedDependencies: string[];
  heavyDependencies: Array<{
    name: string;
    size: string;
    alternatives?: string[];
  }>;
  duplicateDependencies: string[];
  recommendations: string[];
}

// List of potentially heavy dependencies and their lighter alternatives
const HEAVY_DEPENDENCIES = {
  'moment': {
    alternatives: ['date-fns', 'dayjs'],
    reason: 'Moment.js is large and immutable. Consider date-fns or dayjs for better tree-shaking.'
  },
  'lodash': {
    alternatives: ['lodash-es', 'ramda'],
    reason: 'Use lodash-es for better tree-shaking or individual lodash functions.'
  },
  'axios': {
    alternatives: ['ky', 'fetch'],
    reason: 'Consider native fetch or lighter alternatives like ky.'
  },
  'material-ui': {
    alternatives: ['@radix-ui', '@headlessui'],
    reason: 'Material-UI is heavy. Consider headless UI libraries.'
  },
  'antd': {
    alternatives: ['@radix-ui', '@headlessui'],
    reason: 'Ant Design is heavy. Consider headless UI libraries.'
  },
  'react-router-dom': {
    alternatives: ['next/router'],
    reason: 'Use Next.js built-in routing instead of React Router.'
  }
};

// Dependencies that are commonly unused in Next.js projects
const POTENTIALLY_UNUSED = [
  'react-router',
  'react-router-dom',
  'webpack',
  'babel-core',
  'babel-loader',
  'css-loader',
  'style-loader',
  'html-webpack-plugin',
  'webpack-dev-server'
];

// Check for duplicate functionality
const DUPLICATE_FUNCTIONALITY = {
  'date-fns': ['moment', 'dayjs'],
  'dayjs': ['moment', 'date-fns'],
  'moment': ['date-fns', 'dayjs'],
  'ky': ['axios', 'node-fetch'],
  'axios': ['ky', 'node-fetch'],
  'node-fetch': ['ky', 'axios'],
  'lodash': ['ramda', 'underscore'],
  'ramda': ['lodash', 'underscore'],
  'underscore': ['lodash', 'ramda']
};

export function analyzeDependencies(packageJson: any): BundleAnalysis {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const analysis: BundleAnalysis = {
    unusedDependencies: [],
    heavyDependencies: [],
    duplicateDependencies: [],
    recommendations: []
  };

  // Check for potentially unused dependencies
  analysis.unusedDependencies = POTENTIALLY_UNUSED.filter(dep => 
    dependencies[dep]
  );

  // Check for heavy dependencies
  Object.keys(dependencies).forEach(dep => {
    if (HEAVY_DEPENDENCIES[dep]) {
      analysis.heavyDependencies.push({
        name: dep,
        size: 'Unknown', // Would need actual bundle analysis
        alternatives: HEAVY_DEPENDENCIES[dep].alternatives
      });
    }
  });

  // Check for duplicate functionality
  const installedDeps = Object.keys(dependencies);
  Object.entries(DUPLICATE_FUNCTIONALITY).forEach(([dep, duplicates]) => {
    if (installedDeps.includes(dep)) {
      const foundDuplicates = duplicates.filter(d => installedDeps.includes(d));
      if (foundDuplicates.length > 0) {
        analysis.duplicateDependencies.push(`${dep} conflicts with: ${foundDuplicates.join(', ')}`);
      }
    }
  });

  // Generate recommendations
  if (analysis.unusedDependencies.length > 0) {
    analysis.recommendations.push(
      `Remove potentially unused dependencies: ${analysis.unusedDependencies.join(', ')}`
    );
  }

  if (analysis.heavyDependencies.length > 0) {
    analysis.recommendations.push(
      'Consider replacing heavy dependencies with lighter alternatives'
    );
  }

  if (analysis.duplicateDependencies.length > 0) {
    analysis.recommendations.push(
      'Remove duplicate functionality to reduce bundle size'
    );
  }

  // Next.js specific recommendations
  if (dependencies['react-router-dom']) {
    analysis.recommendations.push(
      'Use Next.js built-in routing instead of React Router'
    );
  }

  if (dependencies['webpack'] || dependencies['babel-core']) {
    analysis.recommendations.push(
      'Remove webpack/babel dependencies - Next.js handles these internally'
    );
  }

  return analysis;
}

// Code splitting recommendations
export const CODE_SPLITTING_PATTERNS = {
  // Heavy components that should be lazy loaded
  heavyComponents: [
    'Chart',
    'Editor',
    'Calendar',
    'DataTable',
    'Map',
    'PDF',
    'Video',
    'Audio'
  ],
  
  // Route-based splitting
  routePatterns: [
    '/admin',
    '/dashboard',
    '/reports',
    '/settings',
    '/profile'
  ],
  
  // Feature-based splitting
  featurePatterns: [
    'auth',
    'payment',
    'analytics',
    'notifications',
    'chat'
  ]
};

export function generateCodeSplittingRecommendations(
  componentNames: string[]
): string[] {
  const recommendations: string[] = [];
  
  componentNames.forEach(name => {
    const lowerName = name.toLowerCase();
    
    CODE_SPLITTING_PATTERNS.heavyComponents.forEach(pattern => {
      if (lowerName.includes(pattern.toLowerCase())) {
        recommendations.push(
          `Consider lazy loading ${name} component using dynamic imports`
        );
      }
    });
  });
  
  return recommendations;
}

// Tree shaking optimization
export const TREE_SHAKING_TIPS = [
  'Use ES6 imports instead of CommonJS require()',
  'Import only what you need from libraries (e.g., import { debounce } from "lodash")',
  'Use babel-plugin-import for automatic tree shaking',
  'Avoid importing entire libraries when only using specific functions',
  'Use webpack-bundle-analyzer to identify unused code',
  'Enable sideEffects: false in package.json for pure modules'
];

// Bundle size optimization checklist
export const OPTIMIZATION_CHECKLIST = [
  {
    category: 'Dependencies',
    items: [
      'Remove unused dependencies',
      'Replace heavy libraries with lighter alternatives',
      'Use tree-shakable versions (e.g., lodash-es instead of lodash)',
      'Avoid polyfills for modern browsers'
    ]
  },
  {
    category: 'Code Splitting',
    items: [
      'Implement route-based code splitting',
      'Lazy load heavy components',
      'Split vendor bundles',
      'Use dynamic imports for conditional features'
    ]
  },
  {
    category: 'Assets',
    items: [
      'Optimize images (WebP, AVIF formats)',
      'Use next/image for automatic optimization',
      'Implement lazy loading for images',
      'Minimize CSS and remove unused styles'
    ]
  },
  {
    category: 'Build Configuration',
    items: [
      'Enable gzip/brotli compression',
      'Configure proper caching headers',
      'Use production builds',
      'Enable minification'
    ]
  }
];

export function generateOptimizationReport(packageJson: any): {
  analysis: BundleAnalysis;
  codeSplittingTips: string[];
  treeSakingTips: string[];
  checklist: typeof OPTIMIZATION_CHECKLIST;
} {
  return {
    analysis: analyzeDependencies(packageJson),
    codeSplittingTips: generateCodeSplittingRecommendations([]),
    treeSakingTips: TREE_SHAKING_TIPS,
    checklist: OPTIMIZATION_CHECKLIST
  };
}