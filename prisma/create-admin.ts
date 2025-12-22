import { PrismaClient, PFStatus } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const adminConfig = {
  email: 'Luizadeffernandes@gmail.com',
  password: 'Admin123!',
  name: 'Luiza Deffernandes',
  phone: '',
}

async function main() {
  console.log('Creating admin account...\n')

  // Check if user already exists in Supabase Auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let userId: string

  const existingUser = existingUsers?.users?.find(
    u => u.email?.toLowerCase() === adminConfig.email.toLowerCase()
  )

  if (existingUser) {
    console.log(`  User already exists in Supabase Auth: ${adminConfig.email}`)
    userId = existingUser.id

    // Update profile to ADMIN
    await prisma.profilePF.upsert({
      where: { id: userId },
      update: {
        role: 'ADMIN',
        status: PFStatus.APPROVED,
      },
      create: {
        id: userId,
        email: adminConfig.email,
        fullName: adminConfig.name,
        phone: adminConfig.phone,
        role: 'ADMIN',
        status: PFStatus.APPROVED,
      },
    })
    console.log(`  Updated profile to ADMIN role`)
  } else {
    // Create new user in Supabase Auth
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: adminConfig.email,
      password: adminConfig.password,
      email_confirm: true,
      user_metadata: {
        full_name: adminConfig.name,
      },
    })

    if (error) {
      console.error(`Error creating user:`, error)
      throw error
    }

    userId = newUser.user.id
    console.log(`  Created user in Supabase Auth: ${adminConfig.email}`)

    // Create profile with ADMIN role
    await prisma.profilePF.create({
      data: {
        id: userId,
        email: adminConfig.email,
        fullName: adminConfig.name,
        phone: adminConfig.phone,
        role: 'ADMIN',
        status: PFStatus.APPROVED,
      },
    })
    console.log(`  Created profile with ADMIN role`)
  }

  console.log('')
  console.log('='.repeat(50))
  console.log('ADMIN ACCOUNT CREATED SUCCESSFULLY!')
  console.log('='.repeat(50))
  console.log('')
  console.log('Email:    ' + adminConfig.email)
  console.log('Password: ' + adminConfig.password)
  console.log('Role:     ADMIN')
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
