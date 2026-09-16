import { NextResponse } from 'next/server';
import { isValidDate, listTodosByDate, createTodo, storageMode } from '../../lib/diary-store';

export async function GET(req) {
  try {
    const date = new URL(req.url).searchParams.get('date');
    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'Param "date" harus format YYYY-MM-DD.' }, { status: 400 });
    }
    const todos = await listTodosByDate(date);
    return NextResponse.json({ date, todos, mode: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat to-do.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { date, title, priority } = await req.json();
    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'Field "date" harus format YYYY-MM-DD.' }, { status: 400 });
    }
    const todo = await createTodo({ date, title, priority });
    return NextResponse.json({ todo, mode: storageMode() }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menambah to-do.' }, { status: 500 });
  }
}
