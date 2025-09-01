# Admin System Usage Examples

## Example 1: Adding Admin by Telegram ID

Set environment variable:
```bash
export ADMIN_IDS="6649936329,123456789"
```

Start the bot - both IDs now have admin access.

## Example 2: Adding Admin by Username

Set environment variable:
```bash
export ADMIN_USERNAMES="rayben445,newadmin"
```

When users @rayben445 and @newadmin interact with the bot (send any message), they'll automatically be promoted to admin status.

## Example 3: GitHub Username Mapping

Set environment variable:
```bash
export GITHUB_ADMIN_MAPPING='{"RayBen445":"6649936329","contributor":"987654321"}'
```

The repository owner (RayBen445) and any mapped GitHub contributors will have admin access.

## Example 4: Combined Configuration

```bash
export ADMIN_IDS="6649936329,111222333"
export ADMIN_USERNAMES="moderator1,moderator2"  
export GITHUB_ADMIN_MAPPING='{"RayBen445":"6649936329"}'
```

This configuration provides multiple ways to grant admin access:
- Direct ID access for 6649936329 and 111222333
- Username-based access for @moderator1 and @moderator2 (after first interaction)
- GitHub mapping for repository contributors

## Testing Your Admin Status

Send `/admininfo` to the bot to check:
- Your Telegram ID
- Your username
- Your current admin status
- Instructions for becoming an admin

## Admin Commands

Once you have admin status, you can use:
- `/admin` - Access the admin panel
- `/broadcast <message>` - Send message to all users
- View user statistics and manage support requests