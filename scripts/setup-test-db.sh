#!/bin/bash

# Database Environment Isolation Setup Script
# Creates a dedicated Supabase project for testing with complete isolation from development

set -e  # Exit on any error

echo "🚀 Setting up isolated test database environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="city-council-analyzer-test"
TEST_PROJECT_ALIAS="test"
ENV_FILE=".env.test"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if user is logged into Supabase
check_supabase_auth() {
    if ! npx supabase projects list >/dev/null 2>&1; then
        echo -e "${RED}❌ Not authenticated with Supabase CLI${NC}"
        echo -e "${YELLOW}Please run: npx supabase login${NC}"
        exit 1
    fi
}

# Function to get existing project reference if it exists
get_existing_project_ref() {
    npx supabase projects list --output json 2>/dev/null | jq -r ".[] | select(.name == \"$PROJECT_NAME\") | .id" 2>/dev/null || echo ""
}

# Function to get organization ID
get_org_id() {
    ORG_OUTPUT=$(npx supabase orgs list --output json 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$ORG_OUTPUT" ]; then
        echo -e "${RED}❌ Failed to get organization list${NC}"
        exit 1
    fi
    
    # Get the first organization ID
    echo "$ORG_OUTPUT" | jq -r '.[0].id' 2>/dev/null
}

# Function to create or get test project
setup_test_project() {
    echo -e "${BLUE}📋 Checking for existing test project...${NC}"
    
    EXISTING_REF=$(get_existing_project_ref)
    
    if [ -n "$EXISTING_REF" ]; then
        echo -e "${GREEN}✅ Found existing test project: $PROJECT_NAME (ref: $EXISTING_REF)${NC}"
        PROJECT_REF="$EXISTING_REF"
    else
        echo -e "${BLUE}🆕 Creating new test project: $PROJECT_NAME${NC}"
        
        # Get organization ID
        ORG_ID=$(get_org_id)
        if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
            echo -e "${RED}❌ Failed to get organization ID${NC}"
            exit 1
        fi
        echo -e "${BLUE}Using organization ID: $ORG_ID${NC}"
        
        # Generate a random password for the test database
        DB_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        
        # Create the project with required parameters
        echo -e "${BLUE}Creating project with org-id: $ORG_ID${NC}"
        CREATE_OUTPUT=$(npx supabase projects create "$PROJECT_NAME" \
            --org-id "$ORG_ID" \
            --db-password "$DB_PASSWORD" \
            --region us-east-1 \
            --output json 2>&1)
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to create project${NC}"
            echo "Error output: $CREATE_OUTPUT"
            exit 1
        fi
        
        PROJECT_REF=$(echo "$CREATE_OUTPUT" | jq -r '.id' 2>/dev/null)
        
        if [ -z "$PROJECT_REF" ] || [ "$PROJECT_REF" = "null" ]; then
            echo -e "${RED}❌ Failed to extract project reference${NC}"
            echo "Create output: $CREATE_OUTPUT"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Created test project with reference: $PROJECT_REF${NC}"
        echo -e "${BLUE}💾 Database password: $DB_PASSWORD${NC}"
        
        # Wait a moment for project to be fully provisioned
        echo -e "${YELLOW}⏳ Waiting for project provisioning...${NC}"
        sleep 10
    fi
}

# Function to link the test project locally
link_test_project() {
    echo -e "${BLUE}🔗 Linking test project locally as '$TEST_PROJECT_ALIAS'...${NC}"
    
    # Check if already linked
    if npx supabase projects list --linked 2>/dev/null | grep -q "$PROJECT_REF"; then
        echo -e "${GREEN}✅ Test project already linked${NC}"
    else
        npx supabase link --project-ref "$PROJECT_REF" --project-name "$TEST_PROJECT_ALIAS"
        echo -e "${GREEN}✅ Test project linked as '$TEST_PROJECT_ALIAS'${NC}"
    fi
}

# Function to push database schema to test project
push_schema() {
    echo -e "${BLUE}📊 Pushing database schema to test project...${NC}"
    
    # Check if we have local migrations
    if [ ! -d "supabase/migrations" ] || [ -z "$(ls -A supabase/migrations 2>/dev/null)" ]; then
        echo -e "${YELLOW}⚠️  No local migrations found. Skipping schema push.${NC}"
        echo -e "${YELLOW}💡 You may need to run migrations manually after setup.${NC}"
        return 0
    fi
    
    # Push the schema
    npx supabase db push --project-name "$TEST_PROJECT_ALIAS"
    echo -e "${GREEN}✅ Schema pushed to test project${NC}"
}

# Function to generate test environment file
generate_env_file() {
    echo -e "${BLUE}🔧 Generating test environment file...${NC}"
    
    # Get the project credentials
    CREDENTIALS=$(npx supabase projects api-keys --project-ref "$PROJECT_REF" --output env)
    
    if [ -z "$CREDENTIALS" ]; then
        echo -e "${RED}❌ Failed to retrieve project credentials${NC}"
        exit 1
    fi
    
    # Create the .env.test file with proper variable names
    cat > "$ENV_FILE" << EOF
# Test Database Environment Variables
# Generated automatically by setup-test-db.sh
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Test project reference: $PROJECT_REF
# Test project name: $PROJECT_NAME

# Supabase test database credentials
NEXT_PUBLIC_SUPABASE_URL=https://$PROJECT_REF.supabase.co
$(echo "$CREDENTIALS" | grep "SUPABASE_ANON_KEY" | sed 's/SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY/')
$(echo "$CREDENTIALS" | grep "SUPABASE_SERVICE_ROLE_KEY")

# Project metadata
TEST_PROJECT_REF=$PROJECT_REF
TEST_PROJECT_NAME=$PROJECT_NAME
EOF
    
    echo -e "${GREEN}✅ Test environment file created: $ENV_FILE${NC}"
}

# Function to verify the setup
verify_setup() {
    echo -e "${BLUE}🔍 Verifying test database setup...${NC}"
    
    # Check if env file was created
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
        exit 1
    fi
    
    # Source the env file and check connectivity
    source "$ENV_FILE"
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        echo -e "${RED}❌ Supabase URL not found in environment file${NC}"
        exit 1
    fi
    
    # Test basic connectivity (simple HTTP check)
    if command_exists curl; then
        if curl -s --fail "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" >/dev/null; then
            echo -e "${GREEN}✅ Test database connectivity verified${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not verify connectivity (this may be normal)${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Test database setup verification complete${NC}"
}

# Function to display next steps
display_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 Test database setup complete!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "  1. Run tests with: ${YELLOW}npm run test:storage${NC}"
    echo -e "  2. Reset test DB: ${YELLOW}npm run test:reset${NC}"
    echo -e "  3. Environment file: ${YELLOW}$ENV_FILE${NC} (auto-loaded by tests)"
    echo ""
    echo -e "${BLUE}📁 Project details:${NC}"
    echo -e "  • Name: $PROJECT_NAME"
    echo -e "  • Reference: $PROJECT_REF"
    echo -e "  • Local alias: $TEST_PROJECT_ALIAS"
    echo -e "  • URL: https://$PROJECT_REF.supabase.co"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Do not commit $ENV_FILE to version control${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🔧 Database Environment Isolation Setup${NC}"
    echo "======================================"
    
    # Check prerequisites
    if ! command_exists npx; then
        echo -e "${RED}❌ npx not found. Please install Node.js and npm.${NC}"
        exit 1
    fi
    
    if ! command_exists jq; then
        echo -e "${RED}❌ jq not found. Please install jq for JSON parsing.${NC}"
        echo -e "${YELLOW}On Ubuntu/WSL: sudo apt install jq${NC}"
        echo -e "${YELLOW}On macOS: brew install jq${NC}"
        exit 1
    fi
    
    # Check Supabase authentication
    check_supabase_auth
    
    # Execute setup steps
    setup_test_project
    link_test_project
    push_schema
    generate_env_file
    verify_setup
    display_next_steps
    
    echo -e "${GREEN}✅ Setup complete! Your test database is ready for isolated testing.${NC}"
}

# Run main function
main "$@"