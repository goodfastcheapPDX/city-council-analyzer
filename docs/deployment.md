# Vercel Deployment Guide for Transcript Analysis System

This guide outlines the steps for deploying the Transcript Analysis System to Vercel. It covers initial setup, environment configuration, and maintenance.

## Prerequisites

- [Vercel account](https://vercel.com/signup)
- [GitHub account](https://github.com/signup) (for repository hosting)
- [Supabase account](https://supabase.com/) (for database)
- [OpenAI API key](https://platform.openai.com/account/api-keys) (for embedding generation)

## Initial Setup

### 1. Create a GitHub Repository

1. Create a new repository on GitHub
2. Push your local project to the GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/transcript-analysis-system.git
   git push -u origin main
   ```

### 2. Connect to Vercel

1. Log in to your Vercel account
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

### 3. Configure Environment Variables

Add the following environment variables in the Vercel project settings:

#### Required Variables:
- `BLOB_READ_WRITE_TOKEN`: Obtained from Vercel Blob Storage settings
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `OPENAI_API_KEY`: Your OpenAI API key

#### Feature Flags:
- `ENABLE_PROCESSING`: Set to "true" to enable transcript processing
- `ENABLE_CACHING`: Set to "true" to enable response caching
- `DEBUG_MODE`: Set to "true" during initial deployment for detailed logs

### 4. Enable Vercel Blob Storage

1. In your Vercel dashboard, go to Storage > Blob
2. Enable Blob Storage for your project
3. Copy the BLOB_READ_WRITE_TOKEN to your environment variables

### 5. Set Up Supabase

1. Create a new Supabase project
2. Create the necessary tables (see database schema in project documentation)
3. Enable the pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy the connection details to your environment variables

## Deployment Process

### 1. Initial Deployment

1. Commit and push your changes to GitHub
2. Vercel will automatically deploy your application
3. Monitor the deployment logs for any errors

### 2. Verify Services

After deployment, verify that all services are working:

1. Check that the dashboard loads
2. Test transcript upload functionality
3. Verify that transcripts are stored in Vercel Blob Storage
4. Check that processing is triggered correctly

### 3. Configure Production Settings

Once everything is working:

1. Set `DEBUG_MODE` to "false"
2. Configure custom domain (optional)
3. Set up team access and permissions (if applicable)

## Maintenance and Updates

### 1. Monitoring

1. Set up monitoring tools in the Vercel dashboard
2. Configure alerts for failures
3. Regularly check logs for any issues

### 2. Updates

To update the deployed application:

1. Make changes to your local code
2. Commit and push to GitHub
3. Vercel will automatically deploy the changes

### 3. Rollbacks

If you need to roll back to a previous version:

1. Go to the Vercel dashboard
2. Navigate to your project's deployments
3. Find the stable deployment you want to roll back to
4. Click "..." > "Promote to Production"

## Troubleshooting

### Common Issues

1. **Deployment Failures**:
   - Check the build logs for errors
   - Verify that all dependencies are correctly installed
   - Ensure environment variables are properly set

2. **Blob Storage Issues**:
   - Verify that the BLOB_READ_WRITE_TOKEN is correct
   - Check file permissions and access settings
   - Monitor storage limits

3. **API Errors**:
   - Check the function logs in Vercel dashboard
   - Verify API keys and service credentials
   - Ensure database connections are working

### Getting Help

If you encounter issues not covered here:

1. Check the [Vercel documentation](https://vercel.com/docs)
2. Search the [Next.js GitHub issues](https://github.com/vercel/next.js/issues)
3. Contact [Vercel support](https://vercel.com/support)

## Best Practices

1. Always test changes locally before pushing to production
2. Use feature branches for development
3. Set up automatic preview deployments for pull requests
4. Regularly back up your database
5. Monitor resource usage to avoid unexpected costs
6. Implement a proper CI/CD pipeline for larger teams