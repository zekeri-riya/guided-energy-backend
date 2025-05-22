import { ChatCompletionTool } from 'openai/resources/chat/completions';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Utility to safely truncate strings if they exceed a certain approximate character limit.
 * The default limit is set near the maximum context tokens (128000),
 * but you can add a safety buffer to account for additional message overhead, tools, etc.
 */
export function truncateString(str: string, limit = 120000): string {
  if (str.length <= limit) return str;
  return str.slice(0, limit) + '\n... [TRUNCATED FOR LENGTH] ...';
}

/**
 * Tool for generating and optimizing blog content based on analysis results
 */
export const blogContentGeneratorTool: ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'generate_blog_content',
      description: 'Generate SEO-optimized blog content based on analysis and content calendar item',
      parameters: {
        type: 'object',
        properties: {
          seoTitle: {
            type: 'string',
            description: 'SEO-optimized title for the blog post'
          },
          metaDescription: {
            type: 'string',
            description: 'SEO-optimized meta description'
          },
          primaryKeywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Primary keywords to target'
          },
          secondaryKeywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Secondary keywords to support the content'
          },
          wordCount: {
            type: 'number',
            description: 'Estimated word count of the generated content'
          },
          readingTime: {
            type: 'number',
            description: 'Estimated reading time in minutes'
          },
          content: {
            type: 'string',
            description: 'The fully formatted, SEO-optimized HTML content'
          },
          emailPreviewContent: {
            type: 'string',
            description: 'Preview content for email sharing'
          },
          headings: {
            type: 'object',
            properties: {
              h1: { type: 'string' },
              h2s: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            description: 'The headings structure of the content'
          },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                suggestion: { type: 'string' },
                placement: { type: 'string' },
                altText: { type: 'string' },
                unsplashSearchPhotoQuery: { type: 'string' }
              }
            },
            description: 'Suggested images to include in the content'
          },
          internalLinks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                targetPage: { type: 'string' },
                placement: { type: 'string' }
              }
            },
            description: 'Suggested internal links'
          },
          externalLinks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                url: { type: 'string' },
                placement: { type: 'string' }
              }
            },
            description: 'Suggested external links for credibility'
          },
          socialSnippets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Promotional snippets for social media'
          },
          seoScore: {
            type: 'number',
            description: 'Estimated SEO score on a scale of 1-10'
          }
        },
        required: [
          'seoTitle', 
          'metaDescription', 
          'primaryKeywords', 
          'secondaryKeywords', 
          'wordCount', 
          'readingTime', 
          'content',
          'emailPreviewContent', 
          'headings', 
          'images', 
          'internalLinks', 
          'externalLinks', 
          'socialSnippets',
          'seoScore'
        ]
      }
    }
  };


export const domainAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_business_core',
      description: 'Analyze core business and market details',
      parameters: {
        type: 'object',
        properties: {
          businessDescription: {
            type: 'string',
            description: 'Detailed description of what the business does'
          },
          industry: {
            type: 'string',
            description: 'Primary industry categorization'
          },
          targetMarket: {
            type: 'string',
            description: 'Primary target market description'
          },
          businessModel: {
            type: 'string',
            description: 'Core business model (B2B, B2C, etc)'
          },
          tags:{
            type: 'array',
            items: { type: 'string'}
          }
        },
        required: ['businessDescription', 'industry', 'targetMarket', 'businessModel', 'tags']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_products_services',
      description: 'Analyze product and service offerings',
      parameters: {
        type: 'object',
        properties: {
          productCategories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Main product/service categories'
          },
          keyFeatures: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key features or capabilities'
          },
          differentiators: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key differentiating factors'
          },
          tags:{
            type: 'array',
            items: { type: 'string'}
          }
        },
        required: ['productCategories', 'keyFeatures', 'differentiators' ,'tags']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'identify_competitors',
      description: 'Identify and categorize competitors',
      parameters: {
        type: 'object',
        properties: {
          competitors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { 
                  type: 'string',
                  enum: ['direct', 'indirect', 'potential']
                },
                description: { type: 'string' },
                tags:{
                  type: 'array',
                  items: { type: 'string'}
                }
              },
              required: ['name', 'type', 'description','tags']
            },
            description: 'List of identified competitors'
          }
        },
        required: ['competitors']
      }
    }
  }
];

export const industryAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_quick_insights',
      description: 'Generate 3-4 key market insights',
      parameters: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['Market Trend', 'Competitive Move', 'Technology Trend', 'Performance Metrics']
                },
                title: {
                  type: 'string',
                  description: 'Brief, clear title'
                },
                description: {
                  type: 'string',
                  description: 'One-line description with specific data point if available'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string'}
                }
              },
              required: ['category', 'title', 'description','tags']
            },
            maxItems: 4,
            minItems: 3
          }
        },
        required: ['insights']
      }
    }
  }
];

export const competitorAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_competitor_profile',
      description: 'Create detailed competitor profile',
      parameters: {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          companyOverview: { type: 'string' },
          productOffering: { type: 'string' },
          marketPosition: { type: 'string' },
          marketNews: { type: 'string' },
          strengths: {
            type: 'array',
            items: { type: 'string' }
          },
          weaknesses: {
            type: 'array',
            items: { type: 'string' }
          },
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                update: { type: 'string' },
                significance: { type: 'string' }
              }
            }
          },
          tags:{
            type: 'array',
            items: { type: 'string'}
          }
        },
        required: ['companyOverview', 'productOffering', 'marketPosition', 'marketNews','strengths', 'weaknesses', 'updates', 'tags']
      }
    }
  }
];

export const competitorsAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_competitors',
      description: 'Analyze and create detailed profiles for competitors',
      parameters: {
        type: 'object',
        properties: {
          competitors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                companyName: { type: 'string' },
                bestFor: { type: 'string' },
                keyFeatures: {
                  type: 'array',
                  items: { type: 'string' }
                },
                pricing: {
                  type: 'object',
                  properties: {
                    basic: { type: 'string' },
                    premium: { type: 'string' }
                  }
                },
                strengths: {
                  type: 'array',
                  items: { type: 'string' }
                },
                weaknesses: {
                  type: 'array',
                  items: { type: 'string' }
                },
                marketPosition: { type: 'string' },
                marketNews: { type: 'string' },
                tags:{
                  type: 'array',
                  items: { type: 'string'}
                },
              },
              required: ['companyName', 'bestFor', 'keyFeatures', 'pricing', 'strengths', 'weaknesses', 'marketPosition', 'marketNews', 'tags']
            }
          }
        },
        required: ['competitors']
      }
    }
  }
];

export const marketAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_market_analysis',
      description: 'Generate market metrics and insights with up to 6 items per section',
      parameters: {
        type: 'object',
        properties: {
          marketUpdates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                company: { type: 'string' },
                source: { type: 'string' },
                date: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                color: { type: 'string'},
                priority:{type: 'string', enum: ['high', 'medium', 'low']},
                category: {
                  type: 'string',
                  enum: ['market movement', 'feature launch', 'user feedback']
                }
              },
              required: ['company', 'source', 'date', 'title', 'description', 'category']
            },
            maxItems: 12,
            minItems: 6
          },
          criticalUpdates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                category: {
                  type: 'string',
                  enum: ['price impact', 'feature launch', 'market movement']
                }
              },
              required: ['title', 'description', 'priority', 'category']
            },
            maxItems: 12,
            minItems: 6
          },
          marketAnalysis: {
            type: 'object',
            properties: {
              keyTrends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    trend: { type: 'string' },
                    description: { type: 'string', optional: true }
                  },
                  required: ['trend']
                },
                maxItems: 12,
                minItems: 6
              }
            },
            required: ['keyTrends']
          }
        },
        required: ['metrics', 'marketUpdates', 'criticalUpdates', 'marketAnalysis']
      }
    }
  }
];

export const contentAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_content_patterns',
      description: 'Analyze content patterns and generate AI-powered recommendations based on social media performance',
      parameters: {
        type: 'object',
        properties: {
          contentTypes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { 
                  type: 'string',
                  description: 'Name of the content category'
                },
                analytics: {
                  type: 'object',
                  properties: {
                    examplesAnalyzed: {
                      type: 'number',
                      description: 'Number of examples analyzed'
                    },
                    successRate: {
                      type: 'number',
                      minimum: 0,
                      maximum: 100,
                      description: 'Success rate percentage'
                    },
                    averageEngagement: {
                      type: 'string',
                      pattern: '^[0-9]+K\\+$',
                      description: 'Average engagement metric'
                    },
                    peakTime: {
                      type: 'string',
                      description: 'Best performing time window'
                    }
                  },
                  required: ['examplesAnalyzed', 'successRate', 'averageEngagement', 'peakTime']
                },
                characteristics: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key characteristics of this content type',
                  minItems: 3
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Related tags for classification'
                }
              },
              required: ['name', 'analytics', 'characteristics', 'tags']
            },
            minItems: 2,
            maxItems: 5
          },
          bestPractices: {
            type: 'object',
            properties: {
              engagementTactics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tactic: { type: 'string' },
                    description: { type: 'string' },
                    effectiveness: {
                      type: 'string',
                      enum: ['high', 'medium', 'low']
                    }
                  },
                  required: ['tactic', 'description', 'effectiveness']
                },
                minItems: 3
              },
              contentStrategy: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    strategy: { type: 'string' },
                    implementation: { type: 'string' },
                    priority: {
                      type: 'string',
                      enum: ['high', 'medium', 'low']
                    }
                  },
                  required: ['strategy', 'implementation', 'priority']
                },
                minItems: 3
              }
            },
            required: ['engagementTactics', 'contentStrategy']
          },
          timingAnalysis: {
            type: 'object',
            properties: {
              bestDays: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    day: { type: 'string' },
                    performance: { type: 'string' },
                    bestTimeWindows: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['day', 'performance', 'bestTimeWindows']
                }
              },
              peakEngagementWindows: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timeWindow: { type: 'string' },
                    engagementRate: { type: 'string' },
                    bestContentTypes: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['timeWindow', 'engagementRate', 'bestContentTypes']
                }
              }
            },
            required: ['bestDays', 'peakEngagementWindows']
          },
          aiRecommendations: {
            type: 'object',
            properties: {
              contentIdeas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    targetAudience: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    predictedEngagement: {
                      type: 'string',
                      pattern: '^[0-9]+K\\+$'
                    },
                    suggestedTiming: { type: 'string' },
                    topics: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['title', 'description', 'targetAudience', 'predictedEngagement']
                },
                minItems: 3
              },
              implementationGuides: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    matchScore: {
                      type: 'number',
                      minimum: 0,
                      maximum: 100
                    },
                    content: {
                      type: 'object',
                      properties: {
                        cover: { type: 'string' },
                        slides: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              title: { type: 'string' },
                              content: { type: 'string' },
                              actionItems: {
                                type: 'array',
                                items: { type: 'string' }
                              }
                            },
                            required: ['title', 'content']
                          }
                        },
                        metrics: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              value: { type: 'string' },
                              improvement: { type: 'string' }
                            },
                            required: ['name', 'value']
                          }
                        }
                      },
                      required: ['cover', 'slides']
                    }
                  },
                  required: ['title', 'matchScore', 'content']
                },
                minItems: 1
              },
              contentTemplates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                    },
                    title: { type: 'string' },
                    matchScore: {
                      type: 'number',
                      minimum: 0,
                      maximum: 100
                    },
                    structure: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          section: { type: 'string' },
                          content: { type: 'string' },
                          examples: {
                            type: 'array',
                            items: { type: 'string' }
                          }
                        },
                        required: ['section', 'content']
                      }
                    },
                    bestPractices: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['type', 'title', 'matchScore', 'structure']
                },
                minItems: 2
              }
            },
            required: ['contentIdeas', 'implementationGuides', 'contentTemplates']
          }
        },
        required: ['contentTypes', 'bestPractices', 'timingAnalysis', 'aiRecommendations']
      }
    }
  }
];

export const contentPlaybookTools: ChatCompletionTool[]  = [
  {
    type: 'function',
    function: {
      name: 'generate_content_playbook',
      description: 'Generate a comprehensive content playbook with patterns, formulas, and AI-powered recommendations',
      parameters: {
        type: 'object',
        properties: {
          contentPatterns: {
            type: 'object',
            properties: {
              patterns: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    type: { type: 'string' },
                    example: { type: 'string' },
                    success_rate: { type: 'string', pattern: '^[0-9]{1,3}%$' },
                    avg_engagement: { type: 'string', pattern: '^[0-9.]+K$' },
                    best_time: { type: 'string' },
                    best_days: { type: 'string' },
                    audience_match: { type: 'string', pattern: '^[0-9]{1,3}%$' },
                    structure: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          step: { type: 'string' },
                          desc: { type: 'string' }
                        },
                        required: ['step', 'desc']
                      },
                      minItems: 5
                    },
                    examples: {
                      type: 'array',
                      items: { type: 'string' },
                      minItems: 5
                    },
                    best_practices: {
                      type: 'array',
                      items: { type: 'string' },
                      minItems: 5
                    }
                  },
                  required: ['title', 'type', 'success_rate', 'avg_engagement', 'structure']
                },
                minItems: 3
              }
            },
            required: ['patterns']
          },
          contentFormulas: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    frameworks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          steps: {
                            type: 'array',
                            items: { type: 'string' },
                            minItems: 5
                          }
                        },
                        required: ['name', 'steps']
                      },
                      minItems: 3
                    }
                  },
                  required: ['title', 'frameworks']
                },
                minItems: 5
              }
            },
            required: ['categories']
          },
          performanceAnalysis: {
            type: 'object',
            properties: {
              timing: {
                type: 'object',
                properties: {
                  bestDays: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        day: { type: 'string' },
                        performance: { type: 'string' },
                        timeWindows: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      },
                      required: ['day', 'performance', 'timeWindows']
                    }
                  },
                  engagement: {
                    type: 'object',
                    properties: {
                      peakHours: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      bestContentTypes: {
                        type: 'object',
                        patternProperties: {
                          "^.*$": { type: 'string' }
                        }
                      }
                    },
                    required: ['peakHours', 'bestContentTypes']
                  }
                },
                required: ['bestDays', 'engagement']
              }
            },
            required: ['timing']
          }
        },
        required: ['contentPatterns', 'contentFormulas', 'performanceAnalysis']
      }
    }
  }
];

export const contentGenerationTools : ChatCompletionTool[]  = [
  {
    type: "function",
    function: {
      name: "generateStandardizedContent",
      description: "Generate standardized content based on input parameters",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the content piece"
          },
          slug: {
            type: "string",
            description: "A URL-friendly version of the title"
          },
          summary: {
            type: "string",
            description: "A brief summary or hook for the content"
          },
          sections: {
            type: "array",
            description: "Content sections with headings and content",
            items: {
              type: "object",
              properties: {
                heading: {
                  type: "string",
                  description: "Section heading"
                },
                content: {
                  type: "string",
                  description: "Content of the section in paragraph format"
                }
              },
              required: ["heading", "content"]
            }
          },
          tags: {
            type: "array",
            description: "Related hashtags or keywords",
            items: {
              type: "string"
            }
          },
          readTime: {
            type: "string",
            description: "Estimated read time"
          },
          callToAction: {
            type: "string",
            description: "Primary call to action"
          }
        },
        required: ["title", "summary", "authorName", "sections", "tags", "callToAction"]
      }
    }
  }
];

export const searchTermGenerationTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_search_terms',
      description: 'Generate optimized search terms for content research categorized by purpose',
      parameters: {
        type: 'object',
        properties: {
          searchTermCategories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'The category name for this group of search terms'
                },
                purpose: {
                  type: 'string',
                  description: 'The purpose of this category of search terms'
                },
                terms: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'The actual search terms',
                  minItems: 4,
                  maxItems: 8
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'The priority level for this category'
                },
                searchType: {
                  type: 'string',
                  enum: ['keyword', 'site', 'news', 'social', 'forum'],
                  description: 'The best type of search to use for these terms'
                }
              },
              required: ['category', 'purpose', 'terms', 'priority', 'searchType']
            },
            description: 'Categories of search terms organized by purpose',
            minItems: 4,
            maxItems: 8
          },
          recommendedTerms: {
            type: 'array',
            items: { type: 'string' },
            description: 'Top recommended search terms across all categories',
            minItems: 5,
            maxItems: 10
          },
          searchOperators: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                operator: { type: 'string' },
                purpose: { type: 'string' },
                example: { type: 'string' }
              },
              required: ['operator', 'purpose', 'example']
            },
            description: 'Search operators that can improve search quality'
          }
        },
        required: ['searchTermCategories', 'recommendedTerms']
      }
    }
  }
];

/**
 * ChatCompletionTool for generating content blueprint
 */
export const contentBlueprintTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'generate_content_blueprint',
    description: 'Generate a comprehensive content blueprint based on analysis results',
    parameters: {
      type: 'object',
      properties: {
        contentPillars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              targetKeywords: {
                type: 'array',
                items: { type: 'string' }
              },
              clusters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    topics: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    keywords: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    contentTypes: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['name', 'topics', 'keywords', 'contentTypes']
                }
              }
            },
            required: ['name', 'description', 'targetKeywords', 'clusters']
          },
          description: 'Main content pillars for the content strategy',
          minItems: 1,
          maxItems: 2
        },
        contentCalendar: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              pillar: { type: 'string' },
              cluster: { type: 'string' },
              contentType: { type: 'string' },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low']
              },
              estimatedVolume: { type: 'number' },
              status: {
                type: 'string',
                enum: ['planned', 'in-progress', 'published']
              },
              dueDate: { 
                type: 'string',
                description: 'Relative due date (e.g., "day 1", "day 4","day 15")'
              }
            },
            required: ['title', 'pillar', 'cluster', 'contentType', 'priority', 'estimatedVolume', 'status','dueDate']
          },
          description: 'Content calendar items for the first 2-3 months',
          minItems: 1,
          maxItems: 2
        },
        contentTemplates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              structure: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    section: { type: 'string' },
                    purpose: { type: 'string' },
                    guidelines: { type: 'string' }
                  },
                  required: ['section', 'purpose', 'guidelines']
                }
              }
            },
            required: ['name', 'type', 'structure']
          },
          description: 'Content templates for different content types',
          minItems: 1,
          maxItems: 2
        }
      },
      required: ['contentPillars', 'contentCalendar', 'contentTemplates']
    }
  }
};

/**
 * Tools for analyzing trends from search results
 */
export const trendAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_trends',
      description: 'Analyze  trends from search results',
      parameters: {
        type: 'object',
        properties: {
          trendingTopics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string' },
                trendIndicator: { 
                  type: 'string',
                  enum: ['rising', 'stable', 'declining']
                },
                relevanceScore: { 
                  type: 'number',
                  minimum: 1,
                  maximum: 10
                },
                description: { type: 'string' },
                relatedKeywords: {
                  type: 'array',
                  items: { type: 'string' }
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['topic', 'trendIndicator', 'relevanceScore', 'description', 'relatedKeywords', 'sourceUrls']
            },
            minItems: 3,
            maxItems: 10
          },
          contentFormats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                format: { type: 'string' },
                popularityScore: { 
                  type: 'number',
                  minimum: 1,
                  maximum: 10
                },
                description: { type: 'string' },
                bestPractices: {
                  type: 'array',
                  items: { type: 'string' }
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['format', 'popularityScore', 'description', 'bestPractices', 'sourceUrls']
            },
            minItems: 2,
            maxItems: 6
          },
          emergingKeywords: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                keyword: { type: 'string' },
                searchTrend: { 
                  type: 'string',
                  enum: ['rising', 'stable', 'declining']
                },
                context: { type: 'string' },
                suggestedApplications: {
                  type: 'array',
                  items: { type: 'string' }
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['keyword', 'searchTrend', 'context', 'suggestedApplications', 'sourceUrls']
            },
            minItems: 5,
            maxItems: 15
          },
          seasonalFactors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                season: { type: 'string' },
                topics: {
                  type: 'array',
                  items: { type: 'string' }
                },
                contentTypes: {
                  type: 'array',
                  items: { type: 'string' }
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['season', 'topics', 'contentTypes', 'sourceUrls']
            },
            minItems: 2,
            maxItems: 4
          }
        },
        required: ['trendingTopics', 'contentFormats', 'emergingKeywords', 'seasonalFactors']
      }
    }
  }
];

/**
 * Tools for analyzing content gaps
 */
export const contentGapsTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_content_gaps',
      description: 'Identify content gaps and opportunities',
      parameters: {
        type: 'object',
        properties: {
          identifiedGaps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string' },
                description: { type: 'string' },
                audienceNeed: { type: 'string' },
                searchPotential: { 
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                competitionLevel: { 
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                implementationDifficulty: { 
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                priorityScore: { 
                  type: 'number',
                  minimum: 1,
                  maximum: 10
                },
                recommendedApproach: { type: 'string' },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['topic', 'description', 'audienceNeed', 'searchPotential', 'competitionLevel', 'implementationDifficulty', 'priorityScore', 'recommendedApproach', 'sourceUrls']
            },
            minItems: 3,
            maxItems: 10
          },
          userQuestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                context: { type: 'string' },
                frequency: { 
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['question', 'context', 'frequency', 'sourceUrls']
            },
            minItems: 5,
            maxItems: 15
          },
          underservedAudiences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                audience: { type: 'string' },
                needs: {
                  type: 'array',
                  items: { type: 'string' }
                },
                contentOpportunities: {
                  type: 'array',
                  items: { type: 'string' }
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['audience', 'needs', 'contentOpportunities', 'sourceUrls']
            },
            minItems: 2,
            maxItems: 5
          }
        },
        required: ['identifiedGaps', 'userQuestions', 'underservedAudiences']
      }
    }
  }
];

/**
 * Tools for analyzing quality benchmarks
 */
export const qualityBenchmarksTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_quality_benchmarks',
      description: 'Identify quality benchmarks and standards',
      parameters: {
        type: 'object',
        properties: {
          contentTypes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                topPerformingExamples: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      url: { type: 'string' },
                      key_strengths: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      sourceUrls: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    },
                    required: ['title', 'url', 'key_strengths', 'sourceUrls']
                  },
                  minItems: 1,
                  maxItems: 3
                },
                qualityIndicators: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      indicator: { type: 'string' },
                      description: { type: 'string' },
                      benchmarkScore: { 
                        type: 'number',
                        minimum: 1,
                        maximum: 10
                      },
                      sourceUrls: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    },
                    required: ['indicator', 'description', 'benchmarkScore', 'sourceUrls']
                  },
                  minItems: 3,
                  maxItems: 6
                },
                structuralElements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      element: { type: 'string' },
                      description: { type: 'string' },
                      importanceScore: { 
                        type: 'number',
                        minimum: 1,
                        maximum: 10
                      },
                      sourceUrls: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    },
                    required: ['element', 'description', 'importanceScore', 'sourceUrls']
                  },
                  minItems: 3,
                  maxItems: 6
                }
              },
              required: ['type', 'topPerformingExamples', 'qualityIndicators', 'structuralElements']
            },
            minItems: 3,
            maxItems: 5
          },
          industryStandards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                description: { type: 'string' },
                benchmarks: {
                  type: 'array',
                  items: { type: 'string' }
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['category', 'description', 'benchmarks', 'sourceUrls']
            },
            minItems: 2,
            maxItems: 5
          }
        },
        required: ['contentTypes', 'industryStandards']
      }
    }
  }
];

/**
 * Tools for analyzing competitor strategies
 */
export const blogCompetitorAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_competitors',
      description: 'Analyze competitor content strategies',
      parameters: {
        type: 'object',
        properties: {
          topCompetitors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                description: { type: 'string' },
                contentFocus: {
                  type: 'array',
                  items: { type: 'string' }
                },
                contentTypes: {
                  type: 'array',
                  items: { type: 'string' }
                },
                strengths: {
                  type: 'array',
                  items: { type: 'string' }
                },
                weaknesses: {
                  type: 'array',
                  items: { type: 'string' }
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['name', 'url', 'description', 'contentFocus', 'contentTypes', 'strengths', 'weaknesses', 'sourceUrls']
            },
            minItems: 3,
            maxItems: 8
          },
          contentStrategies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                strategy: { type: 'string' },
                description: { type: 'string' },
                users: {
                  type: 'array',
                  items: { type: 'string' }
                },
                effectiveness: { 
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                applicabilityScore: { 
                  type: 'number',
                  minimum: 1,
                  maximum: 10
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['strategy', 'description', 'users', 'effectiveness', 'applicabilityScore', 'sourceUrls']
            },
            minItems: 3,
            maxItems: 8
          },
          keywordTargets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                keyword: { type: 'string' },
                competitors: {
                  type: 'array',
                  items: { type: 'string' }
                },
                difficulty: { 
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                opportunity: { 
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                sourceUrls: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['keyword', 'competitors', 'difficulty', 'opportunity', 'sourceUrls']
            },
            minItems: 5,
            maxItems: 15
          }
        },
        required: ['topCompetitors', 'contentStrategies', 'keywordTargets']
      }
    }
  }
];

/**
 * Tools for analyzing email marketing trends
 */
export const emailTrendsAnalysisTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_email_trends",
      description: "Analyzes email marketing trends from search results",
      parameters: {
        type: "object",
        properties: {
          trendingTopics: {
            type: "array",
            description: "List of trending topics in email marketing",
            items: {
              type: "object",
              properties: {
                topic: { type: "string", description: "Name of the trending topic" },
                trend: { type: "string", description: "Description of the trend" },
                impact: { type: "string", description: "Impact on email marketing metrics" },
                relevance: { type: "number", description: "Relevance score from 1-10" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          emailFormats: {
            type: "array",
            description: "Popular and emerging email formats",
            items: {
              type: "object",
              properties: {
                format: { type: "string", description: "Name of the email format" },
                effectiveness: { type: "number", description: "Effectiveness score from 1-10" },
                bestPractices: { type: "array", items: { type: "string" } },
                examples: { type: "array", items: { type: "string" } },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          designElements: {
            type: "array",
            description: "Key design elements for effective emails",
            items: {
              type: "object",
              properties: {
                element: { type: "string", description: "Name of the design element" },
                impact: { type: "string", description: "Impact on email performance" },
                implementation: { type: "string", description: "How to implement it" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          seasonalFactors: {
            type: "array",
            description: "Seasonal factors affecting email campaigns",
            items: {
              type: "object",
              properties: {
                season: { type: "string", description: "Season or time period" },
                impact: { type: "string", description: "How it affects email campaigns" },
                recommendations: { type: "array", items: { type: "string" } },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          }
        },
        required: ["trendingTopics", "emailFormats"]
      }
    }
  }
];

/**
 * Tools for analyzing email subject lines
 */
export const subjectLineAnalysisTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_subject_lines",
      description: "Analyzes effective email subject line patterns",
      parameters: {
        type: "object",
        properties: {
          subjectLinePatterns: {
            type: "array",
            description: "Effective subject line patterns",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string", description: "The subject line pattern" },
                description: { type: "string", description: "Description of the pattern" },
                effectiveness: { type: "number", description: "Effectiveness score from 1-10" },
                examples: { type: "array", items: { type: "string" } },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          formatGuidelines: {
            type: "object",
            description: "Formatting guidelines for subject lines",
            properties: {
              idealLength: { type: "object", properties: {
                characters: { type: "string" },
                words: { type: "string" }
              }},
              caseUsage: { type: "string", description: "Guidelines for uppercase/lowercase" },
              symbolsAndEmoji: { type: "string", description: "Guidelines for symbols and emoji" },
              personalization: { type: "string", description: "Guidelines for personalization" },
              source: { type: "string", description: "Source URL or reference" }
            }
          },
          emotionalTriggers: {
            type: "array",
            description: "Emotional triggers that drive open rates",
            items: {
              type: "object",
              properties: {
                trigger: { type: "string", description: "The emotional trigger" },
                impact: { type: "string", description: "Impact on open rates" },
                examples: { type: "array", items: { type: "string" } },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          industrySpecificInsights: {
            type: "array",
            description: "Industry-specific subject line insights",
            items: {
              type: "object",
              properties: {
                industry: { type: "string", description: "Industry name" },
                insights: { type: "array", items: { type: "string" } },
                examples: { type: "array", items: { type: "string" } },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          }
        },
        required: ["subjectLinePatterns", "formatGuidelines"]
      }
    }
  }
];

/**
 * Tools for analyzing email content structure
 */
export const contentStructureAnalysisTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_content_structure",
      description: "Analyzes effective email content structures",
      parameters: {
        type: "object",
        properties: {
          effectiveStructures: {
            type: "array",
            description: "Effective email content structures",
            items: {
              type: "object",
              properties: {
                structureType: { type: "string", description: "Type of content structure" },
                sections: { type: "array", items: { type: "string" }, description: "Sections in this structure" },
                effectiveness: { type: "number", description: "Effectiveness score from 1-10" },
                bestFor: { type: "array", items: { type: "string" }, description: "Best use cases" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          contentLengthGuidelines: {
            type: "array",
            description: "Content length guidelines by email type",
            items: {
              type: "object",
              properties: {
                emailType: { type: "string", description: "Type of email" },
                idealLength: { type: "string", description: "Ideal content length" },
                reasoning: { type: "string", description: "Reasoning behind recommendation" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          formattingTechniques: {
            type: "array",
            description: "Effective email formatting techniques",
            items: {
              type: "object",
              properties: {
                technique: { type: "string", description: "Formatting technique" },
                impact: { type: "string", description: "Impact on engagement" },
                implementation: { type: "string", description: "How to implement it" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          ctaAnalysis: {
            type: "array",
            description: "Call-to-action analysis",
            items: {
              type: "object",
              properties: {
                ctaType: { type: "string", description: "Type of CTA" },
                placement: { type: "string", description: "Optimal placement" },
                wording: { type: "array", items: { type: "string" }, description: "Effective wording examples" },
                design: { type: "string", description: "Design recommendations" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          }
        },
        required: ["effectiveStructures", "ctaAnalysis"]
      }
    }
  }
];

/**
 * Tools for analyzing audience segmentation
 */
export const audienceSegmentationAnalysisTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_audience_segmentation",
      description: "Analyzes effective audience segmentation strategies",
      parameters: {
        type: "object",
        properties: {
          segmentationStrategies: {
            type: "array",
            description: "Effective segmentation strategies",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string", description: "Segmentation strategy" },
                implementation: { type: "string", description: "How to implement it" },
                effectiveness: { type: "number", description: "Effectiveness score from 1-10" },
                metrics: { type: "string", description: "Metrics improved by this strategy" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          personalizationTechniques: {
            type: "array",
            description: "Effective personalization techniques",
            items: {
              type: "object",
              properties: {
                technique: { type: "string", description: "Personalization technique" },
                impact: { type: "string", description: "Impact on engagement" },
                implementation: { type: "string", description: "How to implement it" },
                examples: { type: "array", items: { type: "string" } },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          behavioralTargeting: {
            type: "array",
            description: "Behavioral targeting strategies",
            items: {
              type: "object",
              properties: {
                behavior: { type: "string", description: "User behavior to target" },
                strategy: { type: "string", description: "Targeting strategy" },
                effectiveness: { type: "number", description: "Effectiveness score from 1-10" },
                implementation: { type: "string", description: "How to implement it" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          },
          timingOptimization: {
            type: "array",
            description: "Timing optimization by segment",
            items: {
              type: "object",
              properties: {
                segment: { type: "string", description: "Audience segment" },
                timing: { type: "string", description: "Optimal timing" },
                frequency: { type: "string", description: "Optimal frequency" },
                reasoning: { type: "string", description: "Reasoning behind recommendation" },
                source: { type: "string", description: "Source URL or reference" }
              }
            }
          }
        },
        required: ["segmentationStrategies", "personalizationTechniques"]
      }
    }
  }
];

/**
 * Tool for generating email campaign blueprint
 */
export const emailBlueprintTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_email_blueprint",
    description: "Generates a comprehensive email campaign blueprint",
    parameters: {
      type: "object",
      properties: {
        campaignName: { type: "string", description: "Name of the email campaign" },
        campaignGoal: { type: "string", description: "Primary goal of the campaign" },
        tone: { type: "string", description: "Overall tone and style for the campaign" },
        audienceSegments: {
          type: "array",
          description: "Target audience segments",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Name of segment" },
              description: { type: "string", description: "Description of segment" },
              personalizationStrategy: { type: "string", description: "How to personalize for this segment" }
            }
          }
        },
        emailSequence: {
          type: "array",
          description: "Sequence of emails in the campaign",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Title of this email" },
              purpose: { type: "string", description: "Purpose of this email" },
              subject: { type: "string", description: "Recommended subject line" },
              subjectAlternatives: { type: "array", items: { type: "string" }, description: "Alternative subject lines" },
              contentType: { type: "string", description: "Content type for this email" },
              structure: { type: "string", description: "Recommended content structure" },
              sections: { type: "array", items: { type: "string" }, description: "Recommended sections" },
              callToAction: { type: "string", description: "Recommended call to action" },
              timing: { type: "string", description: "When to send this email in the sequence" },
              status: { type: "string", description: "Status of this email", enum: ["pending", "generated", "sent"] }
            }
          }
        },
        personalizationStrategy: {
          type: "object",
          description: "Overall personalization strategy",
          properties: {
            tokens: { type: "array", items: { type: "string" }, description: "Personalization tokens to use" },
            conditionalContent: { type: "array", items: { type: "string" }, description: "Conditional content strategies" },
            abTestingRecommendations: { type: "array", items: { type: "string" }, description: "A/B testing recommendations" }
          }
        },
        keyMetrics: {
          type: "array",
          description: "Key metrics to track",
          items: {
            type: "object",
            properties: {
              metric: { type: "string", description: "Name of metric" },
              description: { type: "string", description: "Description of metric" },
              benchmark: { type: "string", description: "Industry benchmark or goal" }
            }
          }
        }
      },
      required: ["campaignName", "campaignGoal", "emailSequence"]
    }
  }
};

export const emailContentGenerationTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "generateEmailContent",
    description: "Generates email content based on campaign parameters",
    parameters: {
      type: "object",
      properties: {
        subject: { 
          type: "string", 
          description: "The email subject line" 
        },
        body: { 
          type: "string", 
          description: "The main email body content with HTML formatting" 
        },
        previewText: { 
          type: "string", 
          description: "Preview text shown in email clients (40-140 characters)" 
        },
        callToAction: { 
          type: "object",
          properties: {
            text: { type: "string", description: "Call-to-action button/link text" },
            url: { type: "string", description: "URL for the call-to-action (placeholder if needed)" }
          }
        },
        alternativeSubjects: {
          type: "array",
          items: { type: "string" },
          description: "2-3 alternative subject lines for A/B testing"
        }
      },
      required: ["subject", "body", "previewText", "callToAction"]
    }
  }
};