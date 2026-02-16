# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# to install dependencies
COPY package*.json ./

# Install dependencies
# Use --omit=dev to skip development dependencies in production
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# This command will generate the optimized production build in the .next directory
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Create a non-root user and switch to it
# This is a security best practice
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Command to run the application
# Next.js production server starts on port 3000 by default
CMD ["npm", "start"]
