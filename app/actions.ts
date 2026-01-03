'use server';

// [변경] 직접 new PrismaClient() 하지 말고, 아까 만든 거 가져오기
import { prisma } from '@/lib/prisma'; 
import { revalidatePath } from 'next/cache';

export async function checkInVisitor(formData: FormData) {
  const name = formData.get('visitorName') as string;

  await prisma.entryLog.create({
    data: { visitor: name },
  });

  revalidatePath('/'); 
}