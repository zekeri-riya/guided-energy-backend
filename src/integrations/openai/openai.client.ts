import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import logger from '../../config/logger';
import { truncateString, domainAnalysisTools, industryAnalysisTools, competitorsAnalysisTools, competitorAnalysisTools, marketAnalysisTools, contentAnalysisTools,
  contentPlaybookTools, contentGenerationTools, searchTermGenerationTools, trendAnalysisTools, contentGapsTools, qualityBenchmarksTools, blogCompetitorAnalysisTools, contentBlueprintTool, blogContentGeneratorTool,
  emailBlueprintTool, audienceSegmentationAnalysisTools,contentStructureAnalysisTools,subjectLineAnalysisTools,emailTrendsAnalysisTools, emailContentGenerationTool
} from './helper';

dotenv.config();

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
    
    if (!key) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({ apiKey: key });
  }

  async analyzeDomainContent(content: { 
    mainContent: string;
    highlights: string[];
    additionalContext: any[];
  }, businessDescription: string) {

    const systemMessage = `You are an expert business analyst. Analyze the company content using the provided tools.
    Focus on specific, factual information and avoid generic statements.`;

    try {
      // Truncate to prevent token overflow.
      const mainContent = truncateString(content.mainContent);
      const highlights = content.highlights.join('\n');
      const additionalContext = truncateString(JSON.stringify(content.additionalContext));
      const prompt = `Analyze this business content and provide a detailed breakdown:

      MAIN CONTENT:
      ${mainContent}

      KEY HIGHLIGHTS:
      ${highlights}

      Business Description:
      ${businessDescription}

      ADDITIONAL CONTEXT:
      ${additionalContext}

      Use all available tools to provide a comprehensive analysis.
      Ensure all information is specific and evidence-based.`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: domainAnalysisTools,
        tool_choice: "auto",
      });

      const analysis = {
        businessCore: {},
        productsServices: {},
        competitors: []
      };

      if (completion.choices[0].message.tool_calls) {
        for (const toolCall of completion.choices[0].message.tool_calls) {
          if (toolCall.type === 'function') {
            const result = JSON.parse(toolCall.function.arguments);
            
            switch (toolCall.function.name) {
              case 'analyze_business_core':
                analysis.businessCore = result;
                break;
              case 'analyze_products_services':
                analysis.productsServices = result;
                break;
              case 'identify_competitors':
                analysis.competitors = result.competitors;
                break;
            }
          }
        }
      }

      return analysis;

    } catch (error) {
      console.error('Error analyzing domain content:', error);
      throw error;
    }
  }

  async analyzeIndustryInsights(content: { 
    mainContent: string;
    highlights: string[];
    additionalContext: any[];
  }, businessDescription: string) {

    const systemMessage = `Generate 3-4 key market insights based on the provided content. 
    Focus on specific, actionable information. Include data points when available.`;
  
    try {
      // Truncate possible large fields
      const mainContent = truncateString(content.mainContent);
      const highlights = truncateString(content.highlights.join('\n'));

      const prompt = `Create market insights for:
                      Business: ${businessDescription}

                      Based on:
                      ${mainContent}
                      ${highlights}`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: industryAnalysisTools,
        tool_choice: { type: "function", function: { name: "generate_quick_insights" } }
      });

      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'generate_quick_insights') {
          const { insights } = JSON.parse(toolCall.function.arguments);

          console.log('Industry Insights:', insights);
          return insights;
        }
      }
  
      throw new Error('Failed to generate insights');

    } catch (error) {
      console.error('Error analyzing domain content:', error);
      throw error;
    }
  }

  async analyzeCompetitorDetails(competitorsDetails: string) {
    const competitorJson = truncateString(JSON.stringify(competitorsDetails));
  
    const systemMessage = `You are an expert competitive intelligence analyst.`;  
  
    try {
      const prompt = `We have some competitor data in JSON format. 
           Analyze the following competitor information and identify key companies and their details.
      Extract company names, core offerings, target markets, strengths, and weaknesses.
      
      Here is the competitor information to analyze:
      ${competitorJson}
      
      Please provide a structured analysis of each major competitor identified.`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: competitorsAnalysisTools,
        tool_choice: "auto",
      });

      if (completion.choices[0].message.tool_calls?.[0]?.type === 'function') {
        return JSON.parse(completion.choices[0].message.tool_calls[0].function.arguments);
      }

      return null;

    } catch (error) {
      console.error('Error analyzing competitor results:', error);
      throw error;
    }
  }

  async analyzeCompetitorResults(competitor: string, results: any[]) {
    const systemMessage = `You are an expert competitive intelligence analyst.
    Analyze the competitor information using the provided tools.
    Focus on actionable insights and strategic value.`;

    try {
      const truncatedResults = truncateString(JSON.stringify(results));

            const prompt = `Analyze this competitor information for ${competitor}:
      ${truncatedResults}

      Provide a comprehensive competitor profile using the available tool.`;


      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: competitorAnalysisTools,
        tool_choice: "auto",
      });

      if (completion.choices[0].message.tool_calls?.[0]?.type === 'function') {
        return JSON.parse(completion.choices[0].message.tool_calls[0].function.arguments);
      }

      return null;

    } catch (error) {
      console.error('Error analyzing competitor results:', error);
      throw error;
    }
  }

  async generateMarketInsights(data: any) {

    const systemMessage = `You are an expert market and competitive intelligence analyst.

Your task is to:
1. Analyze real-time market data and competitor movements
2. Identify critical market updates that require immediate attention
3. Spot emerging trends and patterns in competitor behavior
4. Provide data-driven insights based on market metrics
5. Focus on actionable, specific insights rather than generic observations

Guidelines:
- Prioritize recent market movements and competitive actions
- Include specific metrics and data points whenever possible
- Label updates with appropriate priority levels based on market impact
- Focus on implications for business strategy and market positioning
- Ensure insights are specific to the company's market segment`;

try {
  const truncatedData = truncateString(JSON.stringify(data));

  const prompt = `Analyze the following market intelligence data and provide actionable insights:

Current Market Context:
${data.businessDescription || 'Technology sector'}

Data for Analysis:
${truncatedData}

Required Outputs:
1. Key metrics showing market health and competitive dynamics
2. 3-6 most significant recent market updates, ordered by importance
3. 2-6 critical updates requiring immediate attention or response
4. 3-6 emerging trends shaping the market

Focus on high-impact insights that could influence business strategy or require tactical responses.`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: marketAnalysisTools,
        tool_choice: "auto",
      });

      if (completion.choices[0].message.tool_calls?.[0]?.type === 'function') {
        console.log('Market Insights:', completion.choices[0].message.tool_calls[0].function.arguments);
        return JSON.parse(completion.choices[0].message.tool_calls[0].function.arguments);
      }

      return null;

    } catch (error) {
      console.error('Error generating market insights:', error);
      throw error;
    }
  }

  async analyzeContentPatterns(tweets: any[], businessData: any) {
    const systemMessage = `You are an expert content strategist and social media analyst.
  Your task is to:
  1. Analyze content performance patterns in social media data
  2. Identify successful content types and characteristics
  3. Determine optimal posting times and engagement patterns
  4. Generate specific, actionable content recommendations
  5. Focus on data-driven insights based on actual performance metrics
  
  Guidelines:
  - Look for clear patterns in high-performing content
  - Include specific metrics and engagement rates
  - Consider timing and audience response patterns
  - Focus on actionable insights for content strategy
  - Ensure recommendations are specific to the business context`;
  
    try {
      // Pre-process tweets to ensure we have consistent format
      const processedTweets = tweets.map(tweet => ({
        text: tweet.text || tweet.content,
        engagement: tweet.engagement || {
          favorites: tweet.favorites || tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
          quotes: tweet.quotes || 0
        },
        timestamp: tweet.timestamp || tweet.created_at,
        metrics: tweet.metrics || {}
      }));

      console.log('Processed Tweets:', processedTweets);
  
      // Structure the data for analysis
      const analysisData = {
        tweets: processedTweets,
        businessContext: {
          name: businessData.businessName,
          industry: businessData.industry,
          description: businessData.businessDescription,
          targetAudience: businessData.targetAudience,
          contentTypes: businessData.contentTypes,
          contentGoals: businessData.contentGoals
        }
      };

      console.log('Analysis Data:', analysisData);
  
      // Create the analysis prompt
      const prompt = `Analyze the following social media content and provide detailed patterns and recommendations:
  
  Business Context:
  ${JSON.stringify(analysisData.businessContext, null, 2)}
  
  Content for Analysis:
  ${JSON.stringify(analysisData.tweets.slice(0, 50), null, 2)}
  
  Required Analysis:
  1. Identify top-performing content patterns
  2. Determine optimal posting times
  3. Extract engagement tactics that work best
  4. Recommend content strategies based on performance
  5. Provide implementation guidelines
  
  Focus on patterns that show clear success metrics and can be replicated.`;
  
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: contentAnalysisTools,
        tool_choice: "auto",
      });
  
      if (completion.choices[0].message.tool_calls?.[0]?.type === 'function') {
        const analysisResults = JSON.parse(
          completion.choices[0].message.tool_calls[0].function.arguments
        );
        
        // Log insights for debugging
        console.log('Content Analysis Results:', JSON.stringify(analysisResults, null, 2));
        
        return analysisResults;
      }
  
      return null;
  
    } catch (error) {
      console.log('Error analyzing content patterns:', error);
      console.error('Error analyzing content patterns:', error);
      throw error;
    }
  }

  async generateContentPlaybook(tweets: any[], businessData: any) {
    const systemMessage = `You are an expert content strategist and social media analyst.
  Your task is to analyze social media content and generate a comprehensive playbook that includes:
  
  1. Content Patterns Analysis
  - Identify high-performing content types (threads, carousels, videos, etc.)
  - Extract successful content structures and formats
  - Determine what makes content viral and engaging
  - Calculate success rates and engagement metrics
  
  2. Content Formulas & Frameworks
  - Break down successful content into replicable formulas
  - Identify storytelling patterns that work
  - Document persuasion frameworks that drive engagement
  - Create step-by-step content templates
  
  3. Timing & Engagement Analysis
  - Find optimal posting windows
  - Identify best-performing days
  - Calculate engagement rates by time
  - Map content types to peak performance times
  
  4. Implementation Guidelines
  - Provide specific, actionable steps
  - Include best practices for each content type
  - Document success metrics and benchmarks
  - Create content creation checklists
  
  Guidelines:
  - Focus on patterns with clear performance metrics
  - Include specific engagement rates and success statistics
  - Provide detailed content structures and examples
  - Ensure recommendations are data-driven
  - Make all insights actionable and specific to the business context`;
  
    try {
      // Pre-process tweets to ensure we have consistent format
      const processedTweets = tweets.map(tweet => ({
        text: tweet.text || tweet.content,
        engagement: tweet.engagement || {
          favorites: tweet.favorites || tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
          quotes: tweet.quotes || 0
        },
        timestamp: tweet.timestamp || tweet.created_at,
        metrics: tweet.metrics || {}
      }));
  
      console.log('Processed Tweets:', processedTweets);
  
      // Structure the data for analysis
      const analysisData = {
        tweets: processedTweets,
        businessContext: {
          name: businessData.businessName,
          industry: businessData.industry,
          description: businessData.businessDescription,
          targetAudience: businessData.targetAudience,
          contentTypes: businessData.contentTypes,
          contentGoals: businessData.contentGoals
        }
      };
  
      console.log('Analysis Data:', analysisData);
  
      // Create the enhanced analysis prompt
      const prompt = `Generate a comprehensive content playbook based on this social media data:
  
  Business Context:
  ${JSON.stringify(analysisData.businessContext, null, 2)}
  
  Content for Analysis:
  ${JSON.stringify(analysisData.tweets.slice(0, 50), null, 2)}
  
  Required Analysis:
  
  1. Content Patterns
  - Identify and categorize top-performing content types
  - Calculate success rates and engagement metrics
  - Extract content structures and formats
  - Document what makes content viral
  
  2. Content Formulas
  - Break down successful content into frameworks
  - Document persuasion patterns that work
  - Create step-by-step templates
  - Include examples for each format
  
  3. Timing Analysis
  - Determine optimal posting windows
  - Map best days for each content type
  - Calculate peak engagement times
  - Identify audience activity patterns
  
  4. Implementation Guidelines
  - Provide specific creation steps
  - Include best practices by content type
  - Document success metrics
  - Create actionable checklists
  
  Focus on patterns that:
  - Show clear success metrics
  - Can be consistently replicated
  - Drive meaningful engagement
  - Align with business goals
  
  Generate specific, data-driven recommendations that can be immediately implemented.`;
  
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: contentPlaybookTools,
        tool_choice: "auto",
      });
  
      if (completion.choices[0].message.tool_calls?.[0]?.type === 'function') {
        const analysisResults = JSON.parse(
          completion.choices[0].message.tool_calls[0].function.arguments
        );
        
        // Log insights for debugging
        console.log('Content Playbook Results:', JSON.stringify(analysisResults, null, 2));
        
        return analysisResults;
      }
  
      return null;
  
    } catch (error) {
      console.log('Error analyzing content patterns:', error);
      console.error('Error analyzing content patterns:', error);
      throw error;
    }
  }

// Updated generateContent function that always produces a standardized structure
async generateContent(params: { 
  contentType: string;
  topicFocus: string;
  contentTone: string;
  contentGenerationData: any;
  businessData: {
    businessName: string;
    industry: string;
    description: string;
    targetAudience: string[];
    brandVoice?: string;
    keyMessages?: string[];
  };
}) {
  const systemMessage = `You are an expert social media content strategist and creator.
Your task is to generate high-quality content based on the specified parameters.

IMPORTANT: Always produce content in a standardized format that works across all content types. 
Regardless of whether the content type is a carousel, thread, article, or video, produce content 
with consistent structure containing:
- A compelling title
- A brief summary
- 3-5 content sections with clear headings and engaging content
- Relevant tags/hashtags
- A strong call to action

Guidelines:
- Always maintain the requested tone throughout
- Focus on the specified topic area
- Ensure content aligns with business context and audience
- For content length: Carousels should have shorter sections, Articles longer, with Threads in the middle
- The content structure must be identical across all content types, ONLY the content length/style changes`;

  try {
    const prompt = `Generate standardized content with the following specifications:

Content Type: ${params.contentType} (note: all content will be formatted in a standard structure)
Topic Focus: ${params.topicFocus}
Content Tone: ${params.contentTone}

Business Context:
${JSON.stringify(params.businessData, null, 2)}

Content Generation Data:
${JSON.stringify(params.contentGenerationData, null, 2)}

Requirements:
1. Return EXACTLY the following standardized structure for ALL content types:
   - title
   - summary
   - sections (array of 3-5 objects with heading and content)
   - tags (array of relevant hashtags)
   - readTime (appropriate for content length)
   - callToAction (compelling action for audience)

2. The content STYLE should be optimized for ${params.contentType}, but the STRUCTURE must follow this standard format
3. Maintain ${params.contentTone} tone throughout
4. Focus on ${params.topicFocus} topic area

REMEMBER: The output will be rendered in a standard UI component, so the data structure must be consistent.`;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: contentGenerationTools,
      tool_choice: { type: "function", function: { name: "generateStandardizedContent" } },
    });

    if (completion.choices[0].message.tool_calls?.[0]?.type === 'function') {
      const contentResults = JSON.parse(
        completion.choices[0].message.tool_calls[0].function.arguments
      );
      
      console.log('Generated Content inside openai:', JSON.stringify(contentResults, null, 2));
      
      // Always include content type in the response for reference
      return {
        ...contentResults,
        contentType: params.contentType
      };
    }

    return null;

  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

  async generateSearchTerms(businessInfo: {
    siteName: string;
    businessName: string;
    websiteUrl: string;
    businessDescription: string;
  }) {
    const systemMessage = `You are an expert SEO researcher and content strategist.
    Your task is to generate optimized search terms for content research.
    Focus on creating diverse, targeted search phrases that will yield high-quality content examples, competitor analysis, and market trends.
    
    Guidelines:
    - Create search terms optimized for different research goals (competitor analysis, trends, quality benchmarking, etc.)
    - Include site-specific searches where relevant (Reddit, Quora, Twitter, etc.)
    - Use appropriate search operators to refine results
    - Consider both informational and commercial intent
    - Include current year where relevant
    - Target specific content formats (guides, lists, comparisons)
    - Use specific industry terminology`;

    try {
      const prompt = this.createSearchTermPrompt(businessInfo);
      
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: searchTermGenerationTools,
        tool_choice: { type: "function", function: { name: "generate_search_terms" } }
      });

      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'generate_search_terms') {
          const result = JSON.parse(toolCall.function.arguments);
          
          return result;
        }
      }

      throw new Error('Failed to generate search terms');

    } catch (error) {
      console.error('Error generating search terms:', error);
      throw error;
    }
  }

  /**
   * Creates a detailed prompt for OpenAI to generate optimized search terms
   */
  private createSearchTermPrompt(businessInfo: {
    siteName: string;
    businessName: string;
    websiteUrl: string;
    businessDescription: string;
  }): string {
    return `Generate optimized search terms for content research based on this business:

Business Name: ${businessInfo.businessName}
Website: ${businessInfo.websiteUrl}
Description: ${businessInfo.businessDescription}

I need comprehensive search terms organized into categories for researching content with Exa.AI. These terms will be used to find:
1. Competitor content and strategies
2. Industry trends and emerging topics
3. High-quality content examples for benchmarking
4. Content gaps and user questions
5. News, social media discussions, and current events

For each category, generate 4-6 search terms that:
- Use exact phrases when appropriate
- Include site: operators for forum research (Reddit, Quora, etc.)
- Target specific content formats (guides, tutorials, lists)
- Include current year where relevant
- Mix direct and long-tail variations
- Include industry-specific terminology
- Target both informational and commercial intent
- Include social media sources (Twitter, LinkedIn)

Make the search terms highly specific to the business domain and target audience.
Provide additional recommended search operators that can be used to refine results.`;
  }

  /**
   * Analyze  trends from search results
   */
  async analyzeTrends(searchResults: any[], businessInfo: any): Promise<any> {
    try {
      const systemMessage = `You are an expert social media trend analyst.
      Your task is to identify current and emerging  trends, popular content formats, and keyword opportunities.
      Focus on specific, data-backed insights rather than general observations.
      Every insight should be supported by specific sources from the provided search results.`;
      
      // Prepare a clean version of the search results for analysis
      const preparedResults = this.prepareResultsForAnalysis(searchResults, 'trends');
      
      // Create a structured prompt
      const prompt = `Analyze these  industry search results to identify current trends, emerging formats, and keyword opportunities:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify key trending topics in the  industry with trend indicators and relevance scores
2. Determine popular and emerging content formats with detailed best practices
3. Extract emerging keywords and their context
4. Identify seasonal factors affecting  content

Focus on insights that:
- Have clear evidence in the sources
- Show measurable trends
- Can be practically applied to content strategy
- Include references to source URLs`;
      
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: trendAnalysisTools,
        tool_choice: { type: "function", function: { name: "analyze_trends" } }
      });
      
      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'analyze_trends') {
          return JSON.parse(toolCall.function.arguments);
        }
      }
      
      throw new Error('Failed to analyze  trends');
    } catch (error) {
      logger.error('Error analyzing  trends:', error);
      throw error;
    }
  }
  
  /**
   * Analyze content gaps from search results
   */
  async analyzeContentGaps(searchResults: any[], businessInfo: any): Promise<any> {
    try {
      const systemMessage = `You are an expert content gap analyzer specializing in the industry.
      Your task is to identify specific content gaps, underserved user needs, and untapped opportunities.
      Focus on concrete, actionable gaps rather than general suggestions.
      Every insight should be supported by specific sources from the provided search results.`;
      
      // Prepare a clean version of the search results for analysis
      const preparedResults = this.prepareResultsForAnalysis(searchResults, 'gaps');
      
      // Create a structured prompt
      const prompt = `Analyze these  industry search results to identify content gaps and opportunities:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify specific content gaps with priority scores and implementation recommendations
2. Extract common user questions that aren't being adequately answered
3. Determine underserved audience segments and their specific needs

Focus on gaps that:
- Have clear evidence in the sources
- Show significant user demand
- Aren't being well-addressed by competitors
- Include references to source URLs`;
      
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: contentGapsTools,
        tool_choice: { type: "function", function: { name: "analyze_content_gaps" } }
      });
      
      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'analyze_content_gaps') {
          return JSON.parse(toolCall.function.arguments);
        }
      }
      
      throw new Error('Failed to analyze content gaps');
    } catch (error) {
      logger.error('Error analyzing content gaps:', error);
      throw error;
    }
  }
  
  /**
   * Analyze quality benchmarks from search results
   */
  async analyzeQualityBenchmarks(searchResults: any[], businessInfo: any): Promise<any> {
    try {
      const systemMessage = `You are an expert content quality analyst specializing in the  industry.
      Your task is to identify quality benchmarks, standards, and best practices from high-performing content.
      Focus on concrete quality indicators that can be measured and replicated.
      Every insight should be supported by specific sources from the provided search results.`;
      
      // Prepare a clean version of the search results for analysis
      const preparedResults = this.prepareResultsForAnalysis(searchResults, 'quality');
      
      // Create a structured prompt
      const prompt = `Analyze these high-quality  industry search results to identify quality benchmarks and standards:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify different content types and their quality benchmarks
2. Determine top-performing examples for each content type
3. Extract quality indicators that correlate with high engagement
4. Identify essential structural elements for each content type
5. Define industry-wide quality standards

Focus on quality elements that:
- Have clear evidence in the sources
- Can be measured and replicated
- Differentiate high-performing content
- Include references to source URLs`;
      
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: qualityBenchmarksTools,
        tool_choice: { type: "function", function: { name: "analyze_quality_benchmarks" } }
      });
      
      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'analyze_quality_benchmarks') {
          return JSON.parse(toolCall.function.arguments);
        }
      }
      
      throw new Error('Failed to analyze quality benchmarks');
    } catch (error) {
      logger.error('Error analyzing quality benchmarks:', error);
      throw error;
    }
  }
  
  /**
   * Analyze competitor strategies from search results
   */
  async analyzeCompetitors(searchResults: any[], businessInfo: any): Promise<any> {
    try {
      const systemMessage = `You are an expert competitive intelligence analyst specializing in the  industry.
      Your task is to analyze competitor content strategies, identify key differentiators, and extract tactical insights.
      Focus on specific, actionable competitor information that can inform content strategy.
      Every insight should be supported by specific sources from the provided search results.`;
      
      // Prepare a clean version of the search results for analysis
      const preparedResults = this.prepareResultsForAnalysis(searchResults, 'competitors');
      
      // Create a structured prompt
      const prompt = `Analyze these  industry search results to identify competitor strategies and approaches:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify the top competitors in the  content space with detailed profiles
2. Extract specific content strategies they employ
3. Determine key target keywords and topics they focus on

Focus on insights that:
- Have clear evidence in the sources
- Reveal specific tactics and approaches
- Can inform content strategy development
- Include references to source URLs`;
      
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: blogCompetitorAnalysisTools,
        tool_choice: { type: "function", function: { name: "analyze_competitors" } }
      });
      
      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'analyze_competitors') {
          return JSON.parse(toolCall.function.arguments);
        }
      }
      
      throw new Error('Failed to analyze competitors');
    } catch (error) {
      logger.error('Error analyzing competitors:', error);
      throw error;
    }
  }
  
  /**
   * Perform comprehensive analysis of all search results in parallel
   */
  async performComprehensiveAnalysis(searchResults: any[], businessInfo: any): Promise<any> {
    try {
      logger.info(`Starting comprehensive content analysis for ${businessInfo.businessName}`);
      
      // Run all analyses in parallel
      const [
        trendAnalysis,
        contentGaps,
        qualityBenchmarks,
        competitorAnalysis
      ] = await Promise.all([
        this.analyzeTrends(searchResults, businessInfo),
        this.analyzeContentGaps(searchResults, businessInfo),
        this.analyzeQualityBenchmarks(searchResults, businessInfo),
        this.analyzeCompetitors(searchResults, businessInfo)
      ]);
      
      logger.info(`Completed comprehensive content analysis for ${businessInfo.businessName}`);
      
      // Combine all results into a single analysis
      return {
        timestamp: new Date().toISOString(),
        businessInfo,
        trendAnalysis,
        contentGaps,
        qualityBenchmarks,
        competitorAnalysis
      };
    } catch (error) {
      logger.error('Error performing comprehensive content analysis:', error);
      throw error;
    }
  }
  
  /**
   * Prepare search results for analysis based on the analysis type
   */
  private prepareResultsForAnalysis(searchResults: any[], analysisType: string): any[] {
    // Extract all search results
    const allResults: any[] = [];
    
    searchResults.forEach(result => {
      if (result && result.results && result.results.results) {
        const resultItems = result.results.results;
        
        // Add each result with its search term
        resultItems.forEach((item: any) => {
          allResults.push({
            searchTerm: result.term,
            title: item.title,
            url: item.url,
            publishedDate: item.publishedDate,
            text: item.text,
            highlights: item.highlights
          });
        });
      }
    });
    
    // Filter results based on analysis type
    let filteredResults = allResults;
    
    if (analysisType === 'trends') {
      // Focus on results related to trends
      filteredResults = allResults.filter(result => 
        result.searchTerm.toLowerCase().includes('trend') ||
        result.searchTerm.toLowerCase().includes('emerging') ||
        result.title.toLowerCase().includes('trend') ||
        result.title.toLowerCase().includes('20') || // Year indicators
        (result.highlights && result.highlights.some((h: string) => 
          h.toLowerCase().includes('trend') || h.toLowerCase().includes('emerging')
        ))
      );
    } else if (analysisType === 'gaps') {
      // Focus on results related to questions and forums
      filteredResults = allResults.filter(result => 
        result.searchTerm.toLowerCase().includes('question') ||
        result.searchTerm.toLowerCase().includes('reddit') ||
        result.searchTerm.toLowerCase().includes('forum') ||
        result.url.toLowerCase().includes('reddit.com') ||
        result.url.toLowerCase().includes('quora.com') ||
        (result.highlights && result.highlights.some((h: string) => 
          h.toLowerCase().includes('question') || h.toLowerCase().includes('need') || 
          h.toLowerCase().includes('looking for')
        ))
      );
    } else if (analysisType === 'quality') {
      // Focus on results related to quality content
      filteredResults = allResults.filter(result => 
        result.searchTerm.toLowerCase().includes('best') ||
        result.searchTerm.toLowerCase().includes('top') ||
        result.searchTerm.toLowerCase().includes('guide') ||
        result.title.toLowerCase().includes('best') ||
        result.title.toLowerCase().includes('top') ||
        result.title.toLowerCase().includes('guide') ||
        (result.highlights && result.highlights.some((h: string) => 
          h.toLowerCase().includes('best') || h.toLowerCase().includes('top') || 
          h.toLowerCase().includes('guide')
        ))
      );
    } else if (analysisType === 'competitors') {
      // Focus on results related to competitors
      filteredResults = allResults.filter(result => 
        result.searchTerm.toLowerCase().includes('competitor') ||
        result.searchTerm.toLowerCase().includes('alternative') ||
        result.title.toLowerCase().includes('vs') ||
        result.title.toLowerCase().includes('alternative') ||
        result.title.toLowerCase().includes('competitor') ||
        (result.highlights && result.highlights.some((h: string) => 
          h.toLowerCase().includes('competitor') || h.toLowerCase().includes('alternative') || 
          h.toLowerCase().includes('vs')
        ))
      );
    }
    
    // If filtered results are empty, return all results
    if (filteredResults.length === 0) {
      return allResults;
    }
    
    // Truncate long texts to avoid token limits
    filteredResults = filteredResults.map(result => ({
      ...result,
      text: truncateString(result.text, 2000) // Shorter limit for individual results
    }));
    
    // Return the most relevant results, limited to avoid token issues
    return filteredResults.slice(0, 15);
  }

  /**
   * Generate a content blueprint based on analysis results
   */
  async generateContentBlueprint(
    businessInfo: any,
    analysisResults: any
  ): Promise<any> {
    try {
      logger.info(`Generating content blueprint for ${businessInfo.businessName}`);
      
      // Define the system message for the blueprint generation
      const systemMessage = `You are an elite content strategy director with expertise in SEO and content marketing.
      Your task is to create a comprehensive content blueprint based on the provided analysis.
      Focus on creating actionable, specific recommendations that align with the business goals.
      The blueprint should leverage trending topics, address content gaps, meet quality benchmarks, and differentiate from competitors.`;
      
      // Prepare analysis data by truncating if necessary
      const truncatedAnalysis = {
        trendAnalysis: truncateString(JSON.stringify(analysisResults.trendAnalysis), 40000),
        contentGaps: truncateString(JSON.stringify(analysisResults.contentGaps), 40000),
        qualityBenchmarks: truncateString(JSON.stringify(analysisResults.qualityBenchmarks), 40000),
        competitorAnalysis: truncateString(JSON.stringify(analysisResults.competitorAnalysis), 40000)
      };
      
      // Create the blueprint prompt
      const prompt = `Based on this detailed content analysis for ${businessInfo.businessName} (${businessInfo.businessDescription}), create a comprehensive content blueprint.

Use these insights to inform your blueprint:

TREND ANALYSIS:
${truncatedAnalysis.trendAnalysis}

CONTENT GAPS:
${truncatedAnalysis.contentGaps}

QUALITY BENCHMARKS:
${truncatedAnalysis.qualityBenchmarks}

COMPETITOR ANALYSIS:
${truncatedAnalysis.competitorAnalysis}

Your blueprint should include:

1. Content Pillars & Clusters
   - Define 2-3 main content pillars that align with the business objectives and identified trends
   - For each pillar, outline 2-3 cluster topics with rationale and relevance
   - Include specific keyword targets for each content cluster
   - Specify content formats for each cluster (guides, listicles, interviews, etc.)

2. Content Calendar
   - Create a prioritized list of two content to create today and tomorrow
   - Organize by pillar and cluster
   - Include priority level based on search potential and competition
   - Specify content type and estimated volume
   - Set relative due dates (day 1, day 2, etc.)

3. Content Templates
   - Create detailed templates for different content types
   - Include section breakdown with purpose for each section
   - Provide specific guidelines for creating high-quality content
   - Use quality benchmarks to inform structure

Ensure all recommendations are specific, actionable, and tailored to ${businessInfo.businessName}'s unique position in the market.`;
      
      // Generate the blueprint with OpenAI
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: [contentBlueprintTool],
        tool_choice: { type: "function", function: { name: "generate_content_blueprint" } }
      });
      
      // Process the response
      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'generate_content_blueprint') {
          const blueprint = JSON.parse(toolCall.function.arguments);
          
          logger.info(`Successfully generated content blueprint with ${blueprint.contentPillars.length} pillars and ${blueprint.contentCalendar.length} calendar items`);
          return blueprint;
        }
      }
      
      throw new Error('Failed to generate content blueprint');
    } catch (error) {
      logger.error('Error generating content blueprint:', error);
      throw error;
    }
  }

    /**
   * Generate content for an "in-progress" item from the content calendar
   */
    async generateContentFromCalendarItem(blogAnalysis: any, specificItem?: any): Promise<any> { 
      try {
          // Use the specific item if provided, otherwise find one with "in-progress" status
          const contentItem = specificItem || blogAnalysis.blueprint.contentCalendar.find(
            (item: any) => item.status === 'in-progress'
          );

          if (!contentItem) {
            throw new Error('No content calendar item found to process');
          }

          logger.info(`Generating content for "${contentItem.title}"`);

          // Get the corresponding pillar and cluster information
          const pillar = blogAnalysis.blueprint.contentPillars.find(
            (p: any) => p.name === contentItem.pillar
          );

          const cluster = pillar?.clusters.find(
            (c: any) => c.name === contentItem.cluster
          );
  
        // Prepare the system message
        const systemMessage = `You are an expert SEO content writer.
        Your task is to create a comprehensive, SEO-optimized blog post based on the provided analysis and content calendar item.
        Focus on creating highly valuable, informative content that addresses the identified gaps and targets key trends.
        The content should be engaging, well-structured, and optimized for search engines while maintaining a natural, conversational tone.`;
  
        // Prepare analysis data by truncating if necessary
        const truncatedAnalysis = {
          trendAnalysis: truncateString(JSON.stringify(blogAnalysis.analysis.trendAnalysis), 40000),
          contentGaps: truncateString(JSON.stringify(blogAnalysis.analysis.contentGaps), 40000),
          qualityBenchmarks: truncateString(JSON.stringify(blogAnalysis.analysis.qualityBenchmarks), 40000),
          competitorAnalysis: truncateString(JSON.stringify(blogAnalysis.analysis.competitorAnalysis), 40000)
        };
  
        // Create the content generation prompt
        const prompt = `Generate a complete, SEO-optimized blog post for ${blogAnalysis.businessInfo.businessName} (${blogAnalysis.businessInfo.businessDescription}).
  
  CONTENT CALENDAR ITEM:
  Title: ${contentItem.title}
  Content Pillar: ${contentItem.pillar}
  Content Cluster: ${contentItem.cluster}
  Content Type: ${contentItem.contentType}
  Priority: ${contentItem.priority}
  Estimated Volume: ${contentItem.estimatedVolume} words
  
  PILLAR & CLUSTER DETAILS:
  ${pillar ? `Pillar: ${pillar.name}
  Pillar Description: ${pillar.description}
  Target Keywords: ${pillar.targetKeywords.join(', ')}` : 'Pillar details not found'}
  
  ${cluster ? `Cluster: ${cluster.name}
  Topics: ${cluster.topics.join(', ')}
  Keywords: ${cluster.keywords.join(', ')}
  Content Types: ${cluster.contentTypes.join(', ')}` : 'Cluster details not found'}
  
  INSIGHTS FROM ANALYSIS:
  
  TREND ANALYSIS:
  ${truncatedAnalysis.trendAnalysis}
  
  CONTENT GAPS:
  ${truncatedAnalysis.contentGaps}
  
  QUALITY BENCHMARKS:
  ${truncatedAnalysis.qualityBenchmarks}
  
  COMPETITOR ANALYSIS:
  ${truncatedAnalysis.competitorAnalysis}
  
  Your blog content should include:
  
  1. SEO Optimization:
     - SEO-optimized title, slug and meta description
     - Proper H1, H2, and H3 heading structure
     - Strategic use of primary and secondary keywords
     - Optimized content length (aim for ${contentItem.estimatedVolume} words)
  
  2. Content Structure:
     - Engaging introduction that hooks the reader
     - Well-organized body with clear sections
     - Informative and valuable content that addresses user needs
     - Compelling conclusion with a clear call-to-action
  
  3. Enhancements:
     - Suggestions for relevant images from unsplash with alt text
     - Internal linking opportunities to other content
     - External linking to authoritative sources
     - Pull quotes or callout sections for key points
  
  4. Promotional:
     - Social media snippets for promoting the content
  
  Ensure the content is original, highly informative, and specifically tailored to ${blogAnalysis.businessInfo.businessName}'s audience and objectives in the industry.`;
  
        // Call OpenAI to generate the blog content
        const completion = await this.client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt }
          ],
          tools: [blogContentGeneratorTool],
          tool_choice: { type: "function", function: { name: "generate_blog_content" } }
        });
  
        // Process the response
        if (completion.choices[0].message.tool_calls) {
          const toolCall = completion.choices[0].message.tool_calls[0];
          if (toolCall.type === 'function' && toolCall.function.name === 'generate_blog_content') {
            const blogContent = JSON.parse(toolCall.function.arguments);
            
            logger.info(`Successfully generated content for "${contentItem.title}" with ${blogContent.wordCount} words`);
            return blogContent;
          }
        }
        
        throw new Error('Failed to generate blog content');
      } catch (error) {
        logger.error('Error generating blog content:', error);
        throw error;
      }
    }

    /**
 * Generate optimized search terms for email marketing research
 */
async generateEmailSearchTerms(businessInfo: {
  businessName: string;
  websiteUrl: string;
  businessDescription: string;
  industry: string;
  targetAudience: string;
}): Promise<any> {
  const systemMessage = `You are an expert email marketing researcher and strategist.
  Your task is to generate optimized search terms for email marketing research.
  Focus on creating diverse, targeted search phrases that will yield high-quality email marketing examples, best practices, and industry trends.`;

  try {
    const prompt = `Generate optimized search terms for email marketing research based on this business:

Business Name: ${businessInfo.businessName}
Industry: ${businessInfo.industry}
Target Audience: ${businessInfo.targetAudience}
Description: ${businessInfo.businessDescription}

I need comprehensive search terms organized into categories for researching email marketing with Exa.AI. These terms will be used to find:
1. Email marketing trends and best practices
2. Effective subject lines and open rates
3. Email content structures that drive engagement
4. Audience segmentation strategies
5. Industry-specific email marketing examples

For each category, generate 4-6 search terms that:
- Include industry-specific terminology
- Target specific email marketing metrics and KPIs
- Include current year where relevant
- Mix direct and long-tail variations
- Include targeted queries for specific segments
- Target both B2B and B2C email strategies as appropriate

Make the search terms highly specific to the business domain and target audience.
Provide additional recommended search operators that can be used to refine results.`;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: searchTermGenerationTools,
      tool_choice: { type: "function", function: { name: "generate_search_terms" } }
    });

    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'generate_search_terms') {
        const result = JSON.parse(toolCall.function.arguments);
        
        return result;
      }
    }

    throw new Error('Failed to generate email search terms');

  } catch (error) {
    console.error('Error generating email search terms:', error);
    throw error;
  }
}

/**
 * Analyze email trends from search results
 */
async analyzeEmailTrends(searchResults: any[], businessInfo: any): Promise<any> {
  try {
    const systemMessage = `You are an expert email marketing trend analyst.
    Your task is to identify current and emerging email marketing trends, popular content formats, and subject line patterns.
    Focus on specific, data-backed insights rather than general observations.
    Every insight should be supported by specific sources from the provided search results.`;
    
    // Prepare a clean version of the search results for analysis
    const preparedResults = this.prepareResultsForAnalysis(searchResults, 'trends');
    
    // Create a structured prompt
    const prompt = `Analyze these email marketing search results to identify current trends and best practices:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify key trending email marketing tactics with trend indicators
2. Determine popular and emerging email formats with detailed best practices
3. Extract key design elements that drive engagement
4. Identify seasonal factors affecting email campaigns

Focus on insights that:
- Have clear evidence in the sources
- Show measurable trends
- Can be practically applied to email strategy
- Include references to source URLs`;
    
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: emailTrendsAnalysisTools,
      tool_choice: { type: "function", function: { name: "analyze_email_trends" } }
    });
    
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'analyze_email_trends') {
        return JSON.parse(toolCall.function.arguments);
      }
    }
    
    throw new Error('Failed to analyze email trends');
  } catch (error) {
    logger.error('Error analyzing email trends:', error);
    throw error;
  }
}

/**
 * Analyze subject lines from search results
 */
async analyzeSubjectLines(searchResults: any[], businessInfo: any): Promise<any> {
  try {
    const systemMessage = `You are an expert email subject line analyst specializing in open rate optimization.
    Your task is to identify high-performing subject line patterns, structures, and techniques.
    Focus on concrete, actionable insights rather than general suggestions.
    Every insight should be supported by specific sources from the provided search results.`;
    
    // Prepare a clean version of the search results for analysis
    const preparedResults = this.prepareResultsForAnalysis(searchResults, 'subject-lines');
    
    // Create a structured prompt
    const prompt = `Analyze these email marketing search results to identify effective subject line patterns:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify specific subject line patterns with effectiveness scores
2. Extract word counts, character lengths, and formatting techniques
3. Determine emotional triggers and psychological techniques
4. Analyze personalization and segmentation approaches

Focus on patterns that:
- Have clear evidence in the sources
- Show significant impact on open rates
- Aren't overly generic or clickbaity
- Include references to source URLs`;
    
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: subjectLineAnalysisTools,
      tool_choice: { type: "function", function: { name: "analyze_subject_lines" } }
    });
    
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'analyze_subject_lines') {
        return JSON.parse(toolCall.function.arguments);
      }
    }
    
    throw new Error('Failed to analyze subject lines');
  } catch (error) {
    logger.error('Error analyzing subject lines:', error);
    throw error;
  }
}

/**
 * Analyze email content structure from search results
 */
async analyzeContentStructure(searchResults: any[], businessInfo: any): Promise<any> {
  try {
    const systemMessage = `You are an expert email content strategist specializing in engagement and conversion.
    Your task is to identify effective email content structures, formats, and techniques.
    Focus on concrete, actionable insights rather than general suggestions.
    Every insight should be supported by specific sources from the provided search results.`;
    
    // Prepare a clean version of the search results for analysis
    const preparedResults = this.prepareResultsForAnalysis(searchResults, 'content');
    
    // Create a structured prompt
    const prompt = `Analyze these email marketing search results to identify effective content structures:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify effective email structures with section breakdowns
2. Extract content length guidelines for different industries
3. Determine text-to-image ratios and formatting techniques
4. Analyze call-to-action placements and wording

Focus on structures that:
- Have clear evidence in the sources
- Show significant impact on engagement and conversion
- Are appropriate for the specific industry
- Include references to source URLs`;
    
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: contentStructureAnalysisTools,
      tool_choice: { type: "function", function: { name: "analyze_content_structure" } }
    });
    
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'analyze_content_structure') {
        return JSON.parse(toolCall.function.arguments);
      }
    }
    
    throw new Error('Failed to analyze content structure');
  } catch (error) {
    logger.error('Error analyzing content structure:', error);
    throw error;
  }
}

/**
 * Analyze audience segmentation from search results
 */
async analyzeAudienceSegmentation(searchResults: any[], businessInfo: any): Promise<any> {
  try {
    const systemMessage = `You are an expert email audience segmentation strategist.
    Your task is to identify effective segmentation strategies, targeting techniques, and personalization approaches.
    Focus on concrete, actionable insights rather than general suggestions.
    Every insight should be supported by specific sources from the provided search results.`;
    
    // Prepare a clean version of the search results for analysis
    const preparedResults = this.prepareResultsForAnalysis(searchResults, 'audience');
    
    // Create a structured prompt
    const prompt = `Analyze these email marketing search results to identify effective audience segmentation strategies:

Business Context:
${JSON.stringify(businessInfo, null, 2)}

Search Results to Analyze:
${JSON.stringify(preparedResults, null, 2)}

Required Analysis:
1. Identify effective segmentation approaches with implementation guidelines
2. Extract personalization techniques and their impact
3. Determine behavioral targeting strategies
4. Analyze frequency and timing optimization by segment

Focus on strategies that:
- Have clear evidence in the sources
- Show significant impact on engagement metrics
- Are appropriate for the specific industry and audience
- Include references to source URLs`;
    
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: audienceSegmentationAnalysisTools,
      tool_choice: { type: "function", function: { name: "analyze_audience_segmentation" } }
    });
    
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'analyze_audience_segmentation') {
        return JSON.parse(toolCall.function.arguments);
      }
    }
    
    throw new Error('Failed to analyze audience segmentation');
  } catch (error) {
    logger.error('Error analyzing audience segmentation:', error);
    throw error;
  }
}

/**
 * Generate an email blueprint based on analysis results
 */
async generateEmailBlueprint(
  businessInfo: any,
  analysisResults: any
): Promise<any> {
  try {
    logger.info(`Generating email blueprint for ${businessInfo.businessName}`);
    
    // Define the system message for the blueprint generation
    const systemMessage = `You are an elite email marketing strategist with expertise in campaign development.
    Your task is to create a comprehensive email campaign blueprint based on the provided analysis.
    Focus on creating actionable, specific recommendations that align with the business goals.
    The blueprint should leverage email trends, effective subject lines, content structures, and audience segmentation strategies.`;
    
    // Prepare analysis data by truncating if necessary
    const truncatedAnalysis = {
      emailTrendAnalysis: truncateString(JSON.stringify(analysisResults.emailTrendAnalysis), 40000),
      subjectLineAnalysis: truncateString(JSON.stringify(analysisResults.subjectLineAnalysis), 40000),
      contentStructureAnalysis: truncateString(JSON.stringify(analysisResults.contentStructureAnalysis), 40000),
      audienceSegmentationAnalysis: truncateString(JSON.stringify(analysisResults.audienceSegmentationAnalysis), 40000)
    };
    
    // Create the blueprint prompt
    const prompt = `Based on this detailed email marketing analysis for ${businessInfo.businessName} (${businessInfo.businessDescription}), create a comprehensive email campaign blueprint.

Use these insights to inform your blueprint:

EMAIL TREND ANALYSIS:
${truncatedAnalysis.emailTrendAnalysis}

SUBJECT LINE ANALYSIS:
${truncatedAnalysis.subjectLineAnalysis}

CONTENT STRUCTURE ANALYSIS:
${truncatedAnalysis.contentStructureAnalysis}

AUDIENCE SEGMENTATION ANALYSIS:
${truncatedAnalysis.audienceSegmentationAnalysis}

Your blueprint should include:

1. Campaign Strategy
   - Define the overall campaign goal and key metrics
   - Outline the campaign tone and style
   - Specify the primary audience segments
   - Define the email frequency and timing

2. Email Sequence
   - Create a sequence of 3-5 emails with:
     - Specific purpose for each email
     - Subject line recommendations for each
     - Content type and structure for each
     - Call-to-action for each email
     - Timing between emails

3. Personalization Strategy
   - Define personalization tokens to use
   - Outline segmentation approach
   - Specify conditional content strategies
   - Provide A/B testing recommendations

Ensure all recommendations are specific, actionable, and tailored to ${businessInfo.businessName}'s unique position in the market.`;
    
    // Generate the blueprint with OpenAI
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: [emailBlueprintTool],
      tool_choice: { type: "function", function: { name: "generate_email_blueprint" } }
    });
    
    // Process the response
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'generate_email_blueprint') {
        const blueprint = JSON.parse(toolCall.function.arguments);
        
        logger.info(`Successfully generated email blueprint with ${blueprint.emailSequence.length} emails in sequence`);
        return blueprint;
      }
    }
    
    throw new Error('Failed to generate email blueprint');
  } catch (error) {
    logger.error('Error generating email blueprint:', error);
    throw error;
  }
}

/**
 * Generate email content based on campaign parameters
 */
async generateEmailContent(params: { 
  campaignName: string;
  purpose: string;
  tone: string;
  contentType: string;
  targetAudience: string;
  businessInfo: {
    name: string;
    industry: string;
    description: string;
  };
}): Promise<any> {
  try {
    const systemMessage = `You are an expert email marketing copywriter with expertise in crafting high-converting emails.
    Your task is to create email content based on the provided parameters.
    Focus on creating compelling, personalized emails that drive engagement and conversions.
    The content should be well-structured, optimized for both mobile and desktop, and include personalization tokens where appropriate.`;
    
    const prompt = `Create a high-performing email for the following campaign:

Campaign Name: ${params.campaignName}
Purpose: ${params.purpose}
Tone: ${params.tone}
Content Type: ${params.contentType}
Target Audience: ${params.targetAudience}

Business Information:
- Name: ${params.businessInfo.name}
- Industry: ${params.businessInfo.industry}
- Description: ${params.businessInfo.description}

Requirements:
1. Compelling subject line (4-9 words, personalized if appropriate)
2. Preview text that complements the subject line (40-140 characters)
3. Well-structured email body with:
   - Personal greeting using {{recipientName}} token
   - Clear, concise paragraphs
   - Bullet points or numbered lists if appropriate
   - Appropriate spacing and formatting
   - Personalization tokens where appropriate
4. Strong call-to-action that aligns with email purpose
5. Professional sign-off
6. 2-3 alternative subject lines for A/B testing

For personalization, use these tokens where appropriate:
- {{recipientName}} - Recipient's name
- {{businessName}} - Business name
- {{senderName}} - Sender's name

The email should be directly formatted for implementation, including all necessary HTML tags, line breaks, and formatting.
Focus on creating content that will achieve the email's purpose and resonate with the target audience.`;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      tools: [emailContentGenerationTool],
      tool_choice: { type: "function", function: { name: "generateEmailContent" } }
    });
    
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'generateEmailContent') {
        const emailContent = JSON.parse(toolCall.function.arguments);
        
        logger.info(`Successfully generated email content for ${params.campaignName}`);
        return emailContent;
      }
    }
    
    throw new Error('Failed to generate email content');
  } catch (error) {
    logger.error('Error generating email content:', error);
    throw error;
  }
}


}