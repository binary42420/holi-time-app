#!/bin/bash
# Start the Cloud SQL Proxy in the background
/usr/local/bin/cloud-sql-proxy --auto-iam-authn --port=5432 elated-fabric-460119-t3:us-west2:holitime-db &
# Start the application
npm run start
