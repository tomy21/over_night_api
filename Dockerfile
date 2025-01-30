FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install PM2 globally
RUN npm install -g pm2

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3002

# Start the application using PM2
CMD ["pm2-runtime", "start", "npm", "--", "start"]
