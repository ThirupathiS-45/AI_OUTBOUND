"""
MongoDB Migration Script: Local → Atlas
Migrates data from local MongoDB to MongoDB Atlas using PyMongo
"""

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from urllib.parse import quote_plus
import sys

def connect_db(uri, description):
    """Connect to MongoDB"""
    try:
        print(f"Connecting to {description}...")
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print(f"✅ Connected to {description}")
        return client
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        print(f"❌ Failed to connect to {description}")
        print(f"   Error: {e}")
        return None

def migrate_database(local_uri, atlas_uri, db_name):
    """Migrate database from local to Atlas"""
    
    print("\n" + "="*60)
    print("🚀 MongoDB Migration: Local → Atlas")
    print("="*60)
    
    # Connect to local MongoDB
    print("\nStep 1: Connecting to Local MongoDB...")
    local_client = connect_db(local_uri, "Local MongoDB")
    if not local_client:
        return False
    
    # Connect to Atlas
    print("\nStep 2: Connecting to MongoDB Atlas...")
    atlas_client = connect_db(atlas_uri, "MongoDB Atlas")
    if not atlas_client:
        return False
    
    try:
        # Get databases
        local_db = local_client[db_name]
        atlas_db = atlas_client[db_name]
        
        # Get all collections
        collections = local_db.list_collection_names()
        print(f"\nStep 3: Found {len(collections)} collection(s): {collections}")
        
        # Migrate each collection
        total_docs = 0
        for collection_name in collections:
            print(f"\n  📦 Migrating '{collection_name}'...")
            
            local_collection = local_db[collection_name]
            atlas_collection = atlas_db[collection_name]
            
            # Get all documents
            documents = list(local_collection.find())
            
            if documents:
                # Insert into Atlas
                result = atlas_collection.insert_many(documents)
                print(f"     ✅ Inserted {len(result.inserted_ids)} documents")
                total_docs += len(result.inserted_ids)
            else:
                print(f"     ⓘ  No documents to migrate")
        
        print("\n" + "="*60)
        print(f"✅ Migration Complete! {total_docs} documents migrated")
        print("="*60)
        return True
        
    finally:
        local_client.close()
        atlas_client.close()

def main():
    print("\n📚 MongoDB Migration Setup\n")
    
    # Local MongoDB URI (default)
    local_uri = input("Local MongoDB URI [mongodb://localhost:27017]: ").strip()
    if not local_uri:
        local_uri = "mongodb://localhost:27017"
    
    # Atlas URI
    atlas_uri = input("\nAtlas Connection String (mongodb+srv://...): ").strip()
    if not atlas_uri:
        print("❌ Atlas URI required")
        sys.exit(1)
    
    # URL-encode the atlas URI to handle special characters in password
    # Extract username and password if present
    if "mongodb+srv://" in atlas_uri:
        try:
            # Parse the connection string
            # Format: mongodb+srv://username:password@host/dbname?options
            prefix = "mongodb+srv://"
            rest = atlas_uri[len(prefix):]
            
            # Find the @ that separates credentials from host
            at_index = rest.rfind("@")
            if at_index > 0:
                credentials = rest[:at_index]
                host_part = rest[at_index+1:]
                
                # Split credentials into username and password
                if ":" in credentials:
                    username, password = credentials.split(":", 1)
                    # URL-encode username and password
                    encoded_user = quote_plus(username)
                    encoded_pass = quote_plus(password)
                    # Reconstruct the URI
                    atlas_uri = f"{prefix}{encoded_user}:{encoded_pass}@{host_part}"
                    print(f"✓ Encoded connection string for special characters")
        except Exception as e:
            print(f"⚠️  Could not auto-encode connection string: {e}")
            print("   Make sure your password is URL-encoded if it contains special characters")
    
    # Database name
    db_name = input("Database Name [ai_sales_db]: ").strip()
    if not db_name:
        db_name = "ai_sales_db"
    
    print(f"\n{'='*60}")
    print("Configuration:")
    print(f"  Local:    {local_uri}")
    print(f"  Atlas:    {atlas_uri[:50]}...")
    print(f"  Database: {db_name}")
    print(f"{'='*60}")
    
    confirm = input("\nProceed with migration? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("Migration cancelled")
        sys.exit(0)
    
    # Run migration
    if migrate_database(local_uri, atlas_uri, db_name):
        print("\n📝 Next Steps:")
        print("   1. Verify data in MongoDB Atlas UI")
        print("   2. Update .env with MONGODB_URI (Atlas connection string)")
        print("   3. Test locally with: python app/main.py")
        print("   4. Deploy to Render\n")
    else:
        print("\n❌ Migration failed. Check your connection strings.")
        sys.exit(1)

if __name__ == "__main__":
    main()
