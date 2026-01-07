// src/app/inventory/action.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. 상품 등록 함수
export async function addGoods(formData: FormData) {
    const name = formData.get('name') as string;
    const price = parseInt(formData.get('price') as string);
    const stock = parseInt(formData.get('stock') as string);

    await prisma.goods.create ( {
        data: {
            name, 
            price, 
            stock,
        },
    });

    revalidatePath('./inventory');
}

// 2. [핵심] 재고 변경 함수 (Atomic Update)
// change 값이 +1이면 증가, -1이면 감소합니다.
export async function updateStock(id: number, change: number, reason: string) {
    // Prisma의 increment 기능을 사용하여 DB 자체적으로 연산하게 함 (동시성 해결)

    // Tip 1: prisma.goods.update(...)를 써서 재고를 변경해야 함.
    // Tip 2: prisma.history.create(...)를 써서 로그를 남겨야 함.
    // Tip 3 (고급): 두 작업은 동시에 성공하거나 동시에 실패해야 함 (Transaction).
    
    await prisma.$transaction([

        prisma.goods.update({
            where: { id },
            data: {
                stock: {
                    increment: change,
                },
            },
        }),

        prisma.history.create ({
        data: { 
            goodsId: id,
            change: change,
            reason: reason,
            // goods: prisma.goods.findFirst({where: { id }}),
         },
        }),
    ])

    // ---------------------------------------------------------

    revalidatePath('./inventory');
}