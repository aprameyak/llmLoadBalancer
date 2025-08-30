# Publishing to GitHub Packages Guide

## Prerequisites

1. **GitHub Personal Access Token (Classic)**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with the following scopes:
     - `read:packages` - to download packages
     - `write:packages` - to upload packages
     - `delete:packages` - to delete packages (optional)
   - Copy the token - you'll need it for authentication

## Authentication Setup

### Option 1: Using .npmrc file (Recommended)
Add your token to the `.npmrc` file by running:

```bash
echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE" >> .npmrc
```

Replace `YOUR_TOKEN_HERE` with your actual personal access token.

### Option 2: Using npm login
```bash
npm login --scope=@aprameyakannan --auth-type=legacy --registry=https://npm.pkg.github.com
```

When prompted:
- Username: your GitHub username
- Password: your personal access token
- Email: your GitHub email

## Publishing Steps

1. **Build the package** (if not already built):
   ```bash
   npm run build
   ```

2. **Test the package**:
   ```bash
   npm test
   ```

3. **Publish to GitHub Packages**:
   ```bash
   npm publish
   ```

## Verification

After publishing, you can:

1. **View your package** on GitHub:
   - Go to your GitHub profile
   - Click on "Packages" tab
   - You should see `@aprameyakannan/llm-load-balancer`

2. **Install the package** in another project:
   ```bash
   npm install @aprameyakannan/llm-load-balancer
   ```

## Updating the Package

To publish updates:

1. Update the version in `package.json`
2. Run `npm run build`
3. Run `npm test`
4. Run `npm publish`

## Troubleshooting

- **Authentication errors**: Make sure your token has the correct scopes
- **Package name conflicts**: Ensure the package name is unique within your scope
- **Registry errors**: Verify the `.npmrc` file is in the project root

## Security Notes

- Never commit your personal access token to version control
- Add `.npmrc` to your `.gitignore` if it contains your token
- Use environment variables in CI/CD pipelines
